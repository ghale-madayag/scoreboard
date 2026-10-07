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
 *   POST {ev:"boot"|"beat", sid:<16 hex>, up:<seconds>, wl:0|1}  -> 204
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

    $valid = in_array($ev, ['boot', 'beat'], true)
        && is_string($sid) && preg_match('/^[0-9a-f]{16}$/', $sid)
        && is_int($up) && $up >= 0 && $up <= 30 * 86400
        && ($wl === 0 || $wl === 1);
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
        json_encode(['t' => time(), 'ev' => $ev, 'sid' => $sid, 'up' => $up, 'wl' => $wl, 'ua' => $ua]) . "\n",
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
        unset($s);
    }
}

$rows = array_values($sessions);
usort($rows, fn ($a, $b) => $a['start'] <=> $b['start']);

$out = [];
foreach ($rows as $i => $s) {
    $row = [
        'started'      => date('D d M H:i', $s['start']),
        'last_seen'    => date('D d M H:i', $s['last']),
        'ran_minutes'  => (int) round(($s['last'] - $s['start']) / 60),
        'beats'        => $s['beats'],
        'wake_lock'    => $s['wake_lock'],
        'browser'      => $s['browser'],
    ];
    if ($i > 0) {
        // Time between the previous run going quiet and this one starting:
        // roughly how long the TV sat on its launcher.
        $row['down_minutes_before'] = (int) round(($s['start'] - $rows[$i - 1]['last']) / 60);
    }
    $out[] = $row;
}

echo json_encode(['sessions' => $out], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
