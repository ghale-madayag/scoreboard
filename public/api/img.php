<?php
/**
 * Same-origin resizing image proxy for the intranet photos.
 *
 * The slides' photos are full-size WordPress uploads — often 2500px+ and
 * 1–3 MB — served by the intranet host, which is slow (5–14 s per image
 * measured from the TV side). A 1080p board never needs more than 1920px,
 * so this fetches the original server-side once, downscales it, and serves
 * the small copy from local disk with long-lived caching from then on.
 *
 * ?src=<url-encoded intranet uploads URL>
 *
 * Failure behaviour: stale cache if there is one, otherwise a 302 to the
 * original URL — the browser then loads the slow original rather than
 * showing a broken slide.
 */

header_remove('X-Powered-By');

const MAX_WIDTH  = 1920;
const CACHE_TTL  = 7 * 86400;   // a week; content at a given URL never changes
const MAX_BYTES  = 25 * 1024 * 1024;

// Never let the query string aim this at an arbitrary host (SSRF) or crawl
// outside the uploads tree. Full-prefix match, no “..”, no query on the
// upstream URL, and only benign path characters.
$src = isset($_GET['src']) ? $_GET['src'] : '';
if (
    !preg_match('~^https://depthintranet\.com/wp-content/uploads/[A-Za-z0-9/_.\-]+\.(jpe?g|png|webp|gif)$~i', $src)
    || strpos($src, '..') !== false
) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'src must be an intranet uploads image URL']);
    exit;
}

$MIME = [
    'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
    'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif',
];

function serveFile($path, $ext, $MIME)
{
    header('Content-Type: ' . $MIME[$ext]);
    header('Cache-Control: public, max-age=' . CACHE_TTL);
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

// Cache beside the script (same reasoning as charts.php: the system temp dir
// is shared and its filenames predictable). .htaccess denies *.cache over HTTP.
$cacheDir = __DIR__ . '/cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0700);
}

// WebP is ~25–35% smaller than JPEG at the same visual quality, and every
// browser pointed at this board supports it — but only convert when the
// client says so (Accept: image/webp), with JPEG as the safe fallback.
// The variant is part of the cache key so the two never cross.
$wantsWebp = function_exists('imagewebp')
    && strpos(isset($_SERVER['HTTP_ACCEPT']) ? $_SERVER['HTTP_ACCEPT'] : '', 'image/webp') !== false;

// "img2": cache schema v2. v1 could store a truncated download (observed
// live: an 86 KB half-webp served for a week as if real), so v1 entries are
// simply never read again and age out via the GC below.
$key = 'img2-' . sha1($src) . ($wantsWebp ? '-w' : '');

// A cached file is only ever written after the completeness checks passed,
// so serving it needs no re-validation.
// Every response carries X-Img-Cache so cache behaviour is observable from
// outside without exposing the cache itself (HTTP access to it is denied).

// Occasionally sweep out cache files nothing has asked for in two weeks
// (the img* pattern also collects retired v1 entries).
if (mt_rand(1, 50) === 1) {
    foreach ((glob("$cacheDir/img*.cache") ?: []) as $old) {
        if (time() - (int) filemtime($old) > 2 * CACHE_TTL) {
            @unlink($old);
        }
    }
}

// Fresh cache hit — the whole point. touch() keeps hot files alive for the GC.
foreach ((glob("$cacheDir/$key.*.cache") ?: []) as $hit) {
    if (time() - (int) filemtime($hit) < CACHE_TTL) {
        $ext = strtolower(explode('.', basename($hit))[1]);
        if (isset($MIME[$ext])) {
            @touch($hit);
            header('X-Img-Cache: hit');
            serveFile($hit, $ext, $MIME);
        }
    }
}

// Fetch the original, with the same hardening as charts.php. The intranet
// host is routinely slow and sometimes barely alive, so there is no hard
// total timeout a healthy transfer could hit — instead a stall detector
// (under 1 KB/s for 20s) kills genuinely dead transfers while a slow but
// flowing multi-MB download is allowed to finish. set_time_limit so PHP's
// own 30s default cannot kill the script mid-transfer.
set_time_limit(180);
$ch = curl_init($src);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_TIMEOUT         => 120,
    CURLOPT_LOW_SPEED_LIMIT => 1024,
    CURLOPT_LOW_SPEED_TIME  => 20,
    CURLOPT_CONNECTTIMEOUT  => 10,
    CURLOPT_FOLLOWLOCATION  => true,
    CURLOPT_MAXREDIRS       => 2,
    CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_PROTOCOLS       => CURLPROTO_HTTPS,
    CURLOPT_MAXFILESIZE     => MAX_BYTES,
]);
$caFile = __DIR__ . '/cacert.pem';
if (is_file($caFile)) {
    curl_setopt($ch, CURLOPT_CAINFO, $caFile);
}
$body     = curl_exec($ch);
$status   = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$expected = (float) curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
curl_close($ch);

// A dying upstream can hand over HTTP 200 with only part of the file — that
// half-image must never be cached OR served (a broken img fires onerror and
// the slide hides it for its whole showing). Two independent checks: the
// declared Content-Length when there was one, and each format's own
// end-of-file marker, which a truncated file by definition lacks.
function looksComplete($bytes, $type)
{
    $n = strlen($bytes);
    if ($n < 32) {
        return false;
    }
    switch ($type) {
        case IMAGETYPE_JPEG:
            return substr($bytes, -2) === "\xFF\xD9";
        case IMAGETYPE_PNG:
            return strpos(substr($bytes, -16), 'IEND') !== false;
        case IMAGETYPE_GIF:
            return substr($bytes, -1) === ';';
        case IMAGETYPE_WEBP:
            $riff = unpack('V', substr($bytes, 4, 4));
            return $riff !== false && ($riff[1] + 8) <= $n;
        default:
            return true;
    }
}

$complete = $body !== false
    && $status === 200
    && strlen($body) <= MAX_BYTES
    && ($expected <= 0 || strlen($body) >= (int) $expected);

$info = $complete ? @getimagesizefromstring($body) : false;
if ($info !== false && !looksComplete($body, $info[2])) {
    $info = false;
}

if ($info === false) {
    // Upstream failed, truncated the file, or sent a non-image: stale cache
    // beats a broken slide, and the original URL beats nothing at all.
    foreach ((glob("$cacheDir/$key.*.cache") ?: []) as $hit) {
        $ext = strtolower(explode('.', basename($hit))[1]);
        if (isset($MIME[$ext])) {
            header('X-Img-Cache: stale');
            serveFile($hit, $ext, $MIME);
        }
    }
    header('X-Img-Cache: fallback');
    header('Location: ' . $src, true, 302);
    exit;
}

[$w, , $type] = $info;
$srcExt = strtolower(pathinfo(parse_url($src, PHP_URL_PATH), PATHINFO_EXTENSION));
if ($srcExt === 'jpeg') {
    $srcExt = 'jpg';
}

$out    = $body;
$outExt = $srcExt;

// Downscale anything wider than the stage, and re-encode everything to the
// smallest format the client accepts — even images that need no resizing
// (a 1600px intranet JPEG still drops ~30% as WebP). GIFs pass through
// untouched (GD would drop animation), and everything passes through if
// this host turns out to lack GD, which still leaves the caching and
// same-origin wins intact. A re-encode is only adopted if it actually came
// out smaller, so nothing can ever get bigger through here.
$editable = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP];
if (in_array($type, $editable, true) && function_exists('imagecreatefromstring')) {
    $im = @imagecreatefromstring($body);
    if ($im !== false) {
        if ($w > MAX_WIDTH) {
            $scaled = imagescale($im, MAX_WIDTH, -1, IMG_BILINEAR_FIXED);
            if ($scaled !== false) {
                imagedestroy($im);
                $im = $scaled;
            }
        }
        ob_start();
        if ($wantsWebp) {
            // Lossy WebP keeps alpha, so PNGs convert safely too.
            $ok = imagewebp($im, null, 80);
            $newExt = 'webp';
        } elseif ($type === IMAGETYPE_PNG) {
            // Keep PNG (may carry transparency); still far smaller at 1920.
            imagesavealpha($im, true);
            $ok = imagepng($im, null, 6);
            $newExt = 'png';
        } elseif ($type === IMAGETYPE_WEBP) {
            $ok = imagewebp($im, null, 80);
            $newExt = 'webp';
        } else {
            $ok = imagejpeg($im, null, 82);
            $newExt = 'jpg';
        }
        $shrunk = ob_get_clean();
        imagedestroy($im);
        // Only adopt the re-encode if it actually helped.
        if ($ok && $shrunk !== false && strlen($shrunk) > 0 && strlen($shrunk) < strlen($body)) {
            $out    = $shrunk;
            $outExt = $newExt;
        }
    }
}

$cacheFile = "$cacheDir/$key.$outExt.cache";
$stored    = is_dir($cacheDir) && is_writable($cacheDir)
    && @file_put_contents($cacheFile, $out, LOCK_EX) === strlen($out);

// "stored" next request serves from local disk; "nostore" means the cache
// directory is not writable on this host and every request will re-fetch —
// that is a deployment problem worth noticing from the outside.
header('X-Img-Cache: ' . ($stored ? 'stored' : 'nostore'));
header('Content-Type: ' . $MIME[$outExt]);
header('Cache-Control: public, max-age=' . CACHE_TTL);
header('Content-Length: ' . strlen($out));
echo $out;
