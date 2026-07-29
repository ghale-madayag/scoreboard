// Quarter / date helpers, all in Australia/Sydney to match the old site.

const TZ = 'Australia/Sydney'

function tzParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const p = {}
  for (const { type, value } of fmt.formatToParts(date)) p[type] = value
  return {
    year: +p.year, month: +p.month, day: +p.day,
    hour: +p.hour % 24, minute: +p.minute, second: +p.second,
  }
}

// UTC ms for a given Sydney wall-clock time (two-pass offset correction).
function sydneyTimeToUtc(year, month, day, hour = 0, minute = 0, second = 0) {
  let guess = Date.UTC(year, month - 1, day, hour, minute, second)
  for (let i = 0; i < 2; i++) {
    const p = tzParts(new Date(guess))
    const asIf = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    guess += Date.UTC(year, month - 1, day, hour, minute, second) - asIf
  }
  return guess
}

export function sydneyToday(date = new Date()) {
  const p = tzParts(date)
  const mm = String(p.month).padStart(2, '0')
  const dd = String(p.day).padStart(2, '0')
  return `${p.year}-${mm}-${dd}`
}

export function sydneyHour(date = new Date()) {
  return tzParts(date).hour
}

function quarterBounds(date = new Date()) {
  const { year, month } = tzParts(date)
  const q = Math.ceil(month / 3)
  const startMonth = (q - 1) * 3 + 1
  const endMonth = q * 3
  const endDay = [3, 12].includes(endMonth) ? 31 : 30
  return { year, q, startMonth, endMonth, endDay }
}

// End of the current quarter, 23:59:59 Sydney, as UTC ms (countdown target).
export function quarterEndUtc(date = new Date()) {
  const { year, endMonth, endDay } = quarterBounds(date)
  return sydneyTimeToUtc(year, endMonth, endDay, 23, 59, 59)
}

// Start of the current quarter (midday Sydney, safe for date math), UTC ms.
export function quarterStartUtc(date = new Date()) {
  const { year, startMonth } = quarterBounds(date)
  return sydneyTimeToUtc(year, startMonth, 1, 12, 0, 0)
}

export function quarterLabel(date = new Date()) {
  const { q, year } = quarterBounds(date)
  return `Q${q} ${year}`
}

export function daysInQuarter(date = new Date()) {
  const { year, startMonth, endMonth, endDay } = quarterBounds(date)
  const start = Date.UTC(year, startMonth - 1, 1)
  const end = Date.UTC(year, endMonth - 1, endDay)
  return Math.round((end - start) / 86400000) + 1
}

// Whole days from quarter start to today (old compare_profit used diff in days).
export function daysElapsedInQuarter(date = new Date()) {
  const { year, startMonth } = quarterBounds(date)
  const p = tzParts(date)
  const start = Date.UTC(year, startMonth - 1, 1)
  const today = Date.UTC(p.year, p.month - 1, p.day)
  return Math.round((today - start) / 86400000)
}
