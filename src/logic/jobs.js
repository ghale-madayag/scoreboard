// Freight-jobs comparison for the current month.
// GetFreightJobs returns one row per year: { Line, Year, Col01..Col12 }
// where ColNN is the job count for month NN. "As of today" = the current
// month's column on the current-year row (falling back to the latest
// non-zero month if this month isn't posted yet).

import { sydneyToday } from './quarter.js'

export function jobsComparison(rows) {
  if (!Array.isArray(rows) || !rows.length) return null

  const currentMonth = Number(sydneyToday().slice(5, 7)) // 1..12
  const years = rows.map((r) => Number(r.Year))
  const maxYear = Math.max(...years)

  const currentRow = rows.find((r) => Number(r.Year) === maxYear)
  const lastYearRow = rows.find((r) => Number(r.Year) === maxYear - 1)
  if (!currentRow) return null

  const col = (row, m) => Number(row[`Col${String(m).padStart(2, '0')}`]) || 0

  // Latest month (<= current month) that actually has jobs on the current row.
  let month = null
  for (let m = currentMonth; m >= 1; m--) {
    if (col(currentRow, m) > 0) { month = m; break }
  }
  if (month == null) return null

  return {
    current: col(currentRow, month),
    lastYear: lastYearRow ? col(lastYearRow, month) : null,
  }
}
