// Weekday rotation: the shared "one item per working day, decided by the date"
// rule used by the quote, term-of-the-day and brain-challenge slides.
//
// Deliberately contains no image imports, so plain Node can load it
// (see scripts/quote-schedule.mjs).
//
// Why date-seeded rather than scheduled: the pick is a pure function of the
// date, so there is no cron job, no stored state, nothing to generate ahead of
// time, every screen shows the same thing all day, and the whole schedule can
// be printed months in advance.

import { sydneyToday } from './quarter.js'

const DAY_MS = 86_400_000

/**
 * Australia/Sydney date, snapped back to the most recent weekday.
 * Saturday and Sunday both resolve to the preceding Friday, so the weekend
 * holds Friday's item rather than burning two nobody is in to read.
 */
export function effectiveWeekday(date = new Date()) {
  const [y, m, d] = sydneyToday(date).split('-').map(Number)
  let ms = Date.UTC(y, m - 1, d)
  const dow = new Date(ms).getUTCDay() // 0 = Sun … 6 = Sat
  if (dow === 6) ms -= DAY_MS
  else if (dow === 0) ms -= 2 * DAY_MS
  return ms
}

// Monday 5 Jan 1970 — the anchor the weekday counter is measured from.
const MONDAY_EPOCH_DAY = 4

/**
 * Number of WEEKDAYS elapsed since the anchor Monday.
 *
 * This must count weekdays, not calendar days. Counting calendar days
 * advances the seed by 7 per week while only 5 items are ever shown, so a list
 * would cycle every N calendar days instead of every N weekdays — with a
 * 21-item list that meant repeating after 15 working days and six entries
 * never appearing at all.
 */
export function weekdaySeed(date = new Date()) {
  const day = Math.floor(effectiveWeekday(date) / DAY_MS)
  const delta = day - MONDAY_EPOCH_DAY // days since anchor Monday
  const week = Math.floor(delta / 7)
  const dayOfWeek = ((delta % 7) + 7) % 7 // 0 = Mon … 4 = Fri (never 5/6: snapped)
  return week * 5 + dayOfWeek
}

/** Positive modulo — plain % goes negative for dates before the anchor. */
export function wrap(i, n) {
  return ((i % n) + n) % n
}

/**
 * Pick the item for a given weekday.
 * `offset` steps back through previous working days: -1 is yesterday's item,
 * which is how the "Yesterday's Answer" panels stay correct without anyone
 * typing it in.
 */
export function pickForWeekday(list, date = new Date(), offset = 0) {
  if (!Array.isArray(list) || !list.length) return null
  return list[wrap(weekdaySeed(date) + offset, list.length)]
}
