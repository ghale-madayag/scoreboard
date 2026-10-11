// The nightly maintenance reload: once between 03:00 and 04:00 TV-local time,
// for memory hygiene and to pick up redeploys.
//
// "Once" is decided by how long THIS page has been up, not by a flag. The
// original kept an "already reloaded tonight" flag in a React ref - but a ref
// lives exactly as long as the page, so the reload itself wiped it: the fresh
// page booted with the flag false, saw it was still 3 a.m. a minute later, and
// reloaded again. The launch log caught it doing that every minute for the
// whole hour - 58 reloads on 11 Oct, 47 on 12 Oct - each one refetching every
// section. Uptime has no such problem: a reload resets it to zero by
// definition, so a page that has just reloaded can never qualify again that
// night, and needs no storage (which a TV browser may not keep anyway).
//
// Kept free of React and the DOM so it can be checked in plain Node.

export const RELOAD_HOUR = 3                   // TV-local - deliberately not Sydney
export const MIN_UPTIME_MS = 60 * 60 * 1000    // > the length of the window itself

export function nightlyReloadDue(now, bootedAt) {
  return now.getHours() === RELOAD_HOUR && now.getTime() - bootedAt >= MIN_UPTIME_MS
}
