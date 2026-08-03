<?php
/**
 * Same-origin proxy for the Azure charts APIs.
 *
 * Those endpoints send no CORS headers, so the browser can't call them
 * directly from this origin. This proxy fetches server-side, caches each
 * dataset for 60 seconds (like the old theme's transient), and always falls
 * back to the last good cache if the upstream is down.
 *
 * ?data=grossprofit (default) -> GetGrossProfit
 * ?data=jobs                  -> GetFreightJobs
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');

const CACHE_TTL = 60; // seconds

// Whitelist of allowed upstreams (never let the query string pick an arbitrary URL).
$UPSTREAMS = [
    'grossprofit' => 'https://depthlogisticscharts-au.azurewebsites.net/api/GetGrossProfit',
    'jobs'        => 'https://depthlogisticscharts-au.azurewebsites.net/api/GetFreightJobs',
];

$dataset = isset($_GET['data']) ? $_GET['data'] : 'grossprofit';
if (!isset($UPSTREAMS[$dataset])) {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown dataset']);
    exit;
}

$cacheFile = sys_get_temp_dir() . "/scoreboard-$dataset.json";

if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
    readfile($cacheFile);
    exit;
}

$ch = curl_init($UPSTREAMS[$dataset]);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_CONNECTTIMEOUT => 10,

    // The upstream is whitelisted above, but a redirect is not — without the
    // two limits below, a hijacked or misconfigured Azure endpoint could bounce
    // this request to an internal address (cloud metadata, localhost, another
    // service on the cPanel host) and we would fetch it server-side and hand
    // the body back to the browser. Redirects are allowed but kept short and
    // HTTPS-only; the Azure endpoints do not currently redirect at all.
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS      => 2,
    CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
]);
// WAMP's PHP has no system CA bundle; use the one shipped alongside if present.
$caFile = __DIR__ . '/cacert.pem';
if (is_file($caFile)) {
    curl_setopt($ch, CURLOPT_CAINFO, $caFile);
}
$body   = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

$valid = $body !== false && $status === 200 && json_decode($body) !== null;

if ($valid) {
    file_put_contents($cacheFile, $body, LOCK_EX);
    echo $body;
    exit;
}

// Upstream failed: serve stale cache if we have one.
if (is_file($cacheFile)) {
    readfile($cacheFile);
    exit;
}

http_response_code(502);
echo json_encode(['error' => "Upstream $dataset API unavailable"]);
