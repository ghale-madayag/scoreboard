<?php
/**
 * Uptime log for the wall display.
 *
 * The board posts {"ev":"boot"} when the page loads and {"ev":"beat"} every
 * five minutes (see src/kiosk.js). Each boot is one launch of the TV browser,
 * so the log answers what the wall itself cannot: how long each run lasted
 * before the browser was closed, and how long the TV then sat on its launcher
 * until someone reopened it.
 *
 *   POST {ev:"boot"|"beat", sid:<16 hex>, up:<seconds>, wl:0|1,
 *         dev:<16 hex>, dp:0|1, bld:<bundle hash>}             -> 204
 *
 *   ...plus, from builds with drop signals: ev:"vis" (sent the instant the
 *   page is hidden or shown), vis:0|1, fr:<frames painted in 1 s>, sl:<slide>.
 *
 * sid is one page load; dev is one BROWSER, remembered across reloads, so
 * the summary can count TVs rather than pages (Puffin keeps abandoned pages
 * running on its servers, so pages over-count). dp says whether that id
 * actually persisted. bld is the bundle hash the page is running, which shows
 * when the TV picks up a deploy. All three are optional: pages still on an
 * older build send none of them.
 *   GET  ?summary                                                 -> JSON
 *
 * Public by necessity - the TV holds no credentials - so it accepts only
 * those four validated fields, never echoes input into markup, reads at most
 * 512 bytes of body, and caps the log so junk writes cannot fill the disk.
 * Stored as *.cache beside the other proxy caches, which .htaccess already
 * refuses to serve over HTTP.
 */

header_remove('X-Powered-By');
header('Cache-Control: no-store');
date_default_timezone_set('Australia/Sydney');

const MAX_LOG_BYTES = 262144; // ~8 days of one TV at a beat per 5 min

$dir = __DIR__ . '/cache';
if (!is_dir($dir)) {
    @mkdir($dir, 0700);
}
$log = "$dir/beat.cache";

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $raw = (string) file_get_contents('php://input', false, null, 0, 512);
    $in  = json_decode($raw, true);
    $ev  = is_array($in) ? ($in['ev'] ?? null) : null;
    $sid = is_array($in) ? ($in['sid'] ?? null) : null;
    $up  = is_array($in) ? ($in['up'] ?? null) : null;
    $wl  = is_array($in) ? ($in['wl'] ?? 0) : 0;
    $dev = is_array($in) ? ($in['dev'] ?? null) : null;
    $dp  = is_array($in) ? ($in['dp'] ?? 0) : 0;
    $bld = is_array($in) ? ($in['bld'] ?? null) : null;
    $vis = is_array($in) ? ($in['vis'] ?? null) : null;
    $fr  = is_array($in) ? ($in['fr'] ?? null) : null;
    $sl  = is_array($in) ? ($in['sl'] ?? null) : null;

    $valid = in_array($ev, ['boot', 'beat', 'vis'], true)
        && is_string($sid) && preg_match('/^[0-9a-f]{16}$/', $sid)
        && is_int($up) && $up >= 0 && $up <= 30 * 86400
        && ($wl === 0 || $wl === 1)
        && ($dev === null || (is_string($dev) && preg_match('/^[0-9a-f]{16}$/', $dev)))
        && ($dp === 0 || $dp === 1)
        && ($bld === null || (is_string($bld) && preg_match('/^[A-Za-z0-9_-]{1,16}$/', $bld)))
        && ($vis === null || $vis === 0 || $vis === 1)
        && ($fr === null || (is_int($fr) && $fr >= 0 && $fr <= 1000))
        && ($sl === null || (is_string($sl) && preg_match('/^[a-z0-9_-]{1,24}$/', $sl)));
    if (!$valid) {
        http_response_code(400);
        exit;
    }

    // Printable ASCII only, truncated: it is only ever used to tell the TV's
    // browser apart from someone checking the board on a laptop.
    $ua = substr((string) preg_replace('/[^\x20-\x7E]/', '', $_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200);

    if (is_file($log) && filesize($log) > MAX_LOG_BYTES) {
        $lines = file($log, FILE_IGNORE_NEW_LINES) ?: [];
        @file_put_contents($log, implode("\n", array_slice($lines, intdiv(count($lines), 2))) . "\n", LOCK_EX);
    }
    @file_put_contents(
        $log,
        json_encode(['t' => time(), 'ev' => $ev, 'sid' => $sid, 'up' => $up, 'wl' => $wl,
            'dev' => $dev, 'dp' => $dp, 'bld' => $bld, 'vis' => $vis, 'fr' => $fr, 'sl' => $sl, 'ua' => $ua]) . "\n",
        FILE_APPEND | LOCK_EX
    );
    http_response_code(204);
    exit;
}

// GET: one row per browser launch, oldest first, times in Sydney local.
header('Content-Type: application/json; charset=utf-8');

$sessions = [];
if (is_file($log)) {
    foreach (file($log, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        $r = json_decode($line, true);
        if (!is_array($r) || !isset($r['sid'], $r['t'])) {
            continue;
        }
        $id = $r['sid'];
        if (!isset($sessions[$id])) {
            $ua = (string) ($r['ua'] ?? '');
            $sessions[$id] = [
                'start'     => (int) $r['t'],
                'last'      => (int) $r['t'],
                'beats'     => 0,
                'wake_lock' => false,
                'browser'   => stripos($ua, 'puffin') !== false ? 'Puffin' : (stripos($ua, 'wv') !== false ? 'WebView' : 'other'),
                'device'    => isset($r['dev']) && is_string($r['dev']) ? $r['dev'] : null,
                'persisted' => (int) ($r['dp'] ?? 0) === 1,
                'build'     => isset($r['bld']) && is_string($r['bld']) ? $r['bld'] : null,
                'shown'     => null,   // latest drop-signal state: true / false / null (no signal)
                'drops'     => [],
                'drawnSlide'=> null,   // slide at the last check-in where it WAS being shown
                'pending'   => null,   // first of two 0-frame check-ins awaiting confirmation
            ];
        }
        $s = &$sessions[$id];
        $s['last'] = max($s['last'], (int) $r['t']);
        if (($r['ev'] ?? '') === 'beat') {
            $s['beats']++;
        }
        if ((int) ($r['wl'] ?? 0) === 1) {
            $s['wake_lock'] = true;
        }
        // Drop signals. "Shown" = visible AND (for check-ins, which carry a frame
        // count) actually painting. A drop is a shown -> not-shown transition, so
        // a page that was never displayed (Puffin preloads, abandoned pages)
        // cannot register one. Two strengths of evidence:
        //  - hidden (a debounced visibility event, or a check-in reporting
        //    hidden): counted at once - the page itself says it is not shown.
        //  - visible but 0 frames: could be one bad measurement (testing hit
        //    exactly that), so it must hold for two check-ins in a row; the drop
        //    is then dated to the first of them.
        if (array_key_exists('vis', $r) && $r['vis'] !== null) {
            $isVisEvent = ($r['ev'] ?? '') === 'vis';
            $fr         = $r['fr'] ?? null;
            $visible    = (int) $r['vis'] === 1;
            $shown      = $visible && ($fr === null || (int) $fr > 0);
            if ($shown) {
                $s['drawnSlide'] = $r['sl'] ?? $s['drawnSlide'];
                $s['pending']    = null;
                $s['shown']      = true;
            } elseif ($s['shown'] === true) {
                if (!$visible) {
                    $s['drops'][] = [
                        't'     => (int) $r['t'],
                        'up'    => (int) $r['t'] - $s['start'],
                        // A visibility event fires at the moment of the drop, so
                        // its slide IS the one on screen; a check-in can be up to
                        // 5 min late, so the last slide seen shown is better.
                        'slide' => $isVisEvent ? ($r['sl'] ?? null) : $s['drawnSlide'],
                        'by'    => 'hidden',
                    ];
                    $s['pending'] = null;
                    $s['shown']   = false;
                } elseif (empty($s['pending'])) {
                    $s['pending'] = ['t' => (int) $r['t'], 'slide' => $s['drawnSlide']];
                } else {
                    $s['drops'][] = [
                        't'     => $s['pending']['t'],
                        'up'    => $s['pending']['t'] - $s['start'],
                        'slide' => $s['pending']['slide'],
                        'by'    => 'stopped painting',
                    ];
                    $s['pending'] = null;
                    $s['shown']   = false;
                }
            } elseif ($s['shown'] === null) {
                $s['shown'] = false;
            }
        }
        unset($s);
    }
}

$rows = array_values($sessions);
usort($rows, fn ($a, $b) => $a['start'] <=> $b['start']);

// Downtime is measured against the previous run IN THE SAME BROWSER. Several
// devices can have the board open at once (the TV plus someone checking from
// a laptop), and comparing against whichever session happened to start last
// produced negative "downtime" whenever two of them overlapped.
$out = [];
$prevLast = [];   // browser => last_seen of that browser's previous run
$runs = [];       // browser => list of run lengths in minutes
foreach ($rows as $s) {
    $b = $s['browser'];
    $ran = (int) round(($s['last'] - $s['start']) / 60);
    $row = [
        'started'      => date('D d M H:i', $s['start']),
        'last_seen'    => date('D d M H:i', $s['last']),
        'ran_minutes'  => $ran,
        'beats'        => $s['beats'],
        'wake_lock'    => $s['wake_lock'],
        'browser'      => $b,
        // First 6 hex of the device id: plenty to tell a handful of TVs apart.
        'device'       => $s['device'] !== null ? substr($s['device'], 0, 6) : null,
        'build'        => $s['build'],
        // null = this page's build predates the drop signals.
        'shown_now'    => $s['shown'],
    ];
    if ($s['drops']) {
        $row['drops'] = array_map(fn ($d) => [
            'at'            => date('D d M H:i', $d['t']),
            'after_minutes' => (int) round($d['up'] / 60),
            'slide'         => $d['slide'],
            'detected_by'   => $d['by'],
        ], $s['drops']);
    }
    if (isset($prevLast[$b])) {
        // Time between this browser's previous run going quiet and this one
        // starting: for the TV, roughly how long it sat on its launcher. Never
        // negative - an overlap within one browser type means two devices,
        // not downtime.
        $row['down_minutes_before'] = max(0, (int) round(($s['start'] - $prevLast[$b]) / 60));
    }
    $prevLast[$b] = max($prevLast[$b] ?? 0, $s['last']);
    $runs[$b][] = $ran;
    $out[] = $row;
}

// One line per browser so the TV's pattern can be read at a glance. Each
// session is judged live on its own (seen in the last 10 minutes - two
// heartbeat intervals). Judging only the newest session got this wrong the
// first time it mattered: Puffin started a second, short-lived page at 13:18
// while the TV's 13:04 session was still checking in on schedule, so the
// summary called the TV "not running" and counted its live run as finished.
// Live runs are left out of the statistics - their length is not a result yet.
$byBrowser = [];
foreach ($rows as $r) {
    $b = $r['browser'];
    $byBrowser[$b] = $byBrowser[$b] ?? ['launches' => 0, 'running_now' => 0, 'finished' => []];
    $byBrowser[$b]['launches']++;
    if ((time() - $r['last']) < 600) {
        $byBrowser[$b]['running_now']++;
    } else {
        $byBrowser[$b]['finished'][] = (int) round(($r['last'] - $r['start']) / 60);
    }
}
foreach ($byBrowser as $b => $agg) {
    $f = $agg['finished'];
    sort($f);
    $n = count($f);
    $byBrowser[$b] = [
        'launches'             => $agg['launches'],
        'running_now'          => $agg['running_now'],
        'finished_runs'        => $n,
        'median_run_minutes'   => $n ? ($n % 2 ? $f[intdiv($n, 2)] : (int) round(($f[$n / 2 - 1] + $f[$n / 2]) / 2)) : null,
        'shortest_run_minutes' => $n ? $f[0] : null,
        'longest_run_minutes'  => $n ? $f[$n - 1] : null,
    ];
}

// Devices with at least one live page right now. This is the "how many TVs"
// answer: several live pages from one device are one TV with abandoned pages
// still running on Puffin's servers, not several TVs. Pages from builds older
// than the device id are listed separately - they cannot be attributed.
$devicesNow = [];
$unattributed = [];
foreach ($rows as $r) {
    if ((time() - $r['last']) >= 600) {
        continue;
    }
    if ($r['device'] === null) {
        $unattributed[$r['browser']] = ($unattributed[$r['browser']] ?? 0) + 1;
        continue;
    }
    $k = $r['device'];
    $devicesNow[$k] = $devicesNow[$k] ?? [
        'device'       => substr($k, 0, 6),
        'browser'      => $r['browser'],
        'id_persisted' => $r['persisted'],
        'live_pages'   => 0,
        'builds'       => [],
    ];
    $devicesNow[$k]['live_pages']++;
    if ($r['build'] !== null && !in_array($r['build'], $devicesNow[$k]['builds'], true)) {
        $devicesNow[$k]['builds'][] = $r['build'];
    }
}
$tvsNow = count(array_filter($devicesNow, fn ($d) => $d['browser'] === 'Puffin'));

// Every drop on a Puffin page that carries a device id - i.e. the TV. Times
// are Sydney; uptime and slide are what to look for patterns in.
$allDrops = [];
foreach ($rows as $r) {
    if ($r['browser'] !== 'Puffin' || $r['device'] === null) {
        continue;
    }
    foreach ($r['drops'] as $d) {
        $allDrops[] = [
            't'             => $d['t'],
            'at'            => date('D d M H:i', $d['t']),
            'device'        => substr($r['device'], 0, 6),
            'after_minutes' => (int) round($d['up'] / 60),
            'slide'         => $d['slide'],
            'detected_by'   => $d['by'],
        ];
    }
}
// The drop the TV actually produced on 12 Oct: its page reported "shown" at
// 12:35 Sydney and then simply stopped - no hidden event, no unpainted
// frames, because Puffin tore the page down outright when the TV dropped.
// So the commonest drop has to be read from silence: a TV page whose last
// report said it was on screen, and which has since missed two check-ins.
// The drop happened within 5 minutes after that last check-in.
//
// Not a drop: the same device starting a new page within 2 minutes (a
// reload - nightly, auto-update, or by hand). back_after_minutes is when any
// TV page next appeared: a few minutes means Puffin recovered by itself; a
// long gap or null means it needed a person.
$puffin = array_values(array_filter($rows, fn ($r) => $r['browser'] === 'Puffin'));
foreach ($puffin as $i => $r) {
    if ($r['device'] === null || $r['shown'] !== true || (time() - $r['last']) < 600) {
        continue;
    }
    $next = null;
    foreach ($puffin as $c) {
        if ($c['start'] > $r['last'] && ($next === null || $c['start'] < $next['start'])) {
            $next = $c;
        }
    }
    if ($next !== null && $next['device'] === $r['device'] && ($next['start'] - $r['last']) <= 120) {
        continue; // a reload, not a drop
    }
    $allDrops[] = [
        't'                  => $r['last'],
        'at'                 => date('D d M H:i', $r['last']),
        'device'             => substr($r['device'], 0, 6),
        'after_minutes'      => (int) round(($r['last'] - $r['start']) / 60),
        'slide'              => $r['drawnSlide'],
        'detected_by'        => 'went silent while on screen (within 5 min after "at")',
        'back_after_minutes' => $next !== null ? (int) round(($next['start'] - $r['last']) / 60) : null,
    ];
}
usort($allDrops, fn ($a, $b) => $a['t'] <=> $b['t']);
$allDrops = array_map(function ($d) { unset($d['t']); return $d; }, array_slice($allDrops, -30));

echo json_encode([
    'tv_drops'                 => $allDrops,
    'tvs_running_now'          => $tvsNow,
    'devices_now'              => array_values($devicesNow),
    'live_pages_without_id'    => $unattributed,
    'by_browser'               => $byBrowser,
    'sessions'                 => $out,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
