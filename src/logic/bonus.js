// Ports of the old child-theme shortcode logic (functions.php) that
// interpreted the Azure GetGrossProfit payload.
// Items look like: { Id, CYTotal: "631,285", Current: 20.0, LastYear: 14.0,
//                    Target: 14.0, GPTarget: "3,075,000" }

import { daysInQuarter, daysElapsedInQuarter } from './quarter.js'

const toNumber = (v) =>
  v == null ? null : parseFloat(String(v).replace(/,/g, '')) || 0

// last_current_value: last item with a non-null Current.
export function lastCurrentItem(items) {
  let last = null
  for (const item of items || []) {
    if (item.Current !== null && item.Current !== undefined) last = item
  }
  return last
}

export function percentAchieved(items) {
  const item = lastCurrentItem(items)
  return item ? item.Current : null
}

// get_current_bonus tiers.
export function bonusForCurrent(current) {
  if (current == null) return null
  if (current > 201) return 5000
  if (current >= 186) return 3500
  if (current >= 171) return 2500
  if (current >= 151) return 2000
  if (current >= 141) return 1500
  if (current >= 131) return 1250
  if (current >= 121) return 1000
  if (current >= 111) return 750
  if (current >= 101) return 500
  return 0
}

// last_valid_current: dial max — 100, or rounded up a step past current.
export function dialMax(current) {
  if (current == null || current < 101) return 100
  return Math.ceil(current / 10) * 10 + 10
}

// compare_target_profit_with_current: is cumulative gross profit (CYTotal)
// at or above the pro-rata quarter target as of today?
export function targetComparison(items, date = new Date()) {
  const item = lastCurrentItem(items)
  if (!item) return null
  const cyTotal = toNumber(item.CYTotal)
  const gpTarget = toNumber(item.GPTarget)
  if (!gpTarget) return null
  const targetAsOfToday = (gpTarget / daysInQuarter(date)) * daysElapsedInQuarter(date)
  return {
    cyTotal,
    gpTarget,
    targetAsOfToday,
    onTrack: cyTotal >= targetAsOfToday,
  }
}

// The quarter label, chart axis and countdown are derived from the Sydney date
// and roll over at midnight. The Azure payload does not: it keeps serving the
// finished quarter until something upstream advances the reporting period. On
// 2026-10-01 that combination drew Q3's completed 92-day series across the Q4
// axis and announced "112% - We hit the target!" on day one of the quarter.
//
// Detect it by asking whether the data outruns the calendar: the index of the
// last day carrying gross profit cannot exceed the days elapsed in the current
// quarter. Compared on `Current > 0` rather than non-null, because the payload
// pads with 0.0 rather than null, so a null-count would never shrink.
//
// GRACE covers an upstream posting a day ahead across the timezone gap. When
// no day carries profit yet the answer is "cannot tell", which returns false -
// a quiet real start to a quarter must never be mistaken for stale data.
const STALE_GRACE_DAYS = 2

export function lastProfitDayIndex(items) {
  let last = -1
  ;(items || []).forEach((item, i) => {
    const c = item && item.Current
    if (typeof c === 'number' && c > 0) last = i
  })
  return last
}

export function isPreviousQuarterData(items, date = new Date()) {
  const last = lastProfitDayIndex(items)
  if (last < 0) return false
  return last > daysElapsedInQuarter(date) + STALE_GRACE_DAYS
}

// Chart series: Current vs Last Year (what the original chart displays),
// trimmed to entries where either exists.
export function chartSeries(items) {
  const rows = (items || []).map((i) => ({
    current: i.Current ?? null,
    lastYear: i.LastYear ?? null,
  }))
  let end = rows.length
  while (end > 0 && rows[end - 1].current == null && rows[end - 1].lastYear == null) end--
  return rows.slice(0, end)
}
