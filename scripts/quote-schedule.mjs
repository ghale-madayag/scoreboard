// Print the upcoming quote schedule for the TV board.
//
//   npm run quotes                   → next 2 working weeks
//   npm run quotes -- 6              → next 6 working weeks
//   npm run quotes -- 4 2026-09-01   → 4 weeks starting from a given date
//
// No generation or scheduling job is needed: each weekday's quote is derived
// from the date, so this prints the real schedule as far ahead as you like.

import { QUOTES, quoteDataFor } from '../src/logic/quotesData.js'

const weeks = Number(process.argv[2]) || 2
const startArg = process.argv[3]

const TZ = 'Australia/Sydney'
const fmtDay = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short' })
const fmtDate = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, day: '2-digit', month: 'short' })

const start = startArg ? new Date(startArg + 'T02:00:00Z') : new Date()

const GREY = '\x1b[90m', BOLD = '\x1b[1m', GREEN = '\x1b[32m', RED = '\x1b[31m', OFF = '\x1b[0m'

const cycle = (n) => `${n} weekdays (~${(n / 5).toFixed(1)} weeks)`

console.log(`\n${BOLD}Focus of the Week — upcoming schedule${OFF}`)
console.log(`${GREY}${QUOTES.length} quotes in rotation · new one each weekday at midnight ${TZ}`)
console.log(`Weekends hold Friday's quote. Repeats after ${cycle(QUOTES.length)}.${OFF}\n`)

let shown = 0
let cursor = new Date(start)
let week = 0

while (week < weeks) {
  const dayName = fmtDay.format(cursor)
  if (dayName === 'Mon' || shown === 0) {
    if (shown > 0) console.log('')
    week++
    if (week > weeks) break
    console.log(`${GREY}── week ${week} ──${OFF}`)
  }
  if (dayName !== 'Sat' && dayName !== 'Sun') {
    const q = quoteDataFor(cursor)
    const label = `${dayName} ${fmtDate.format(cursor)}`
    console.log(`  ${label.padEnd(12)} ${GREEN}${q.author.padEnd(24)}${OFF} ${GREY}${clip(q.text, 62)}${OFF}`)
    shown++
  }
  cursor = new Date(cursor.getTime() + 86_400_000)
}

function clip(s = '', n) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ── self-checks ─────────────────────────────────────────────────────────────
// These are the mistakes that are invisible on the day and embarrassing on the
// wall: the same face two working days running.
const seq = []
let c = new Date(start)
for (let i = 0; i < 120; i++) {
  const d = fmtDay.format(c)
  if (d !== 'Sat' && d !== 'Sun') seq.push(quoteDataFor(c).author)
  c = new Date(c.getTime() + 86_400_000)
}
const repeats = seq.filter((a, i) => i > 0 && a === seq[i - 1])
console.log(
  repeats.length
    ? `\n${RED}⚠ same author on consecutive weekdays ${repeats.length}× — reorder QUOTES in quotesData.js${OFF}\n`
    : `\n${GREY}✓ no author repeats on consecutive weekdays (checked 120 days ahead)${OFF}\n`
)
