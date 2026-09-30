import React from 'react'
import { chartSeries } from '../logic/bonus.js'
import { quarterStartUtc, quarterEndUtc } from '../logic/quarter.js'

const TZ = 'Australia/Sydney'
const monShort = (ms) =>
  new Intl.DateTimeFormat('en-AU', { timeZone: TZ, month: 'short' }).format(new Date(ms)).slice(0, 3).toUpperCase()
const dayNum = (ms) =>
  new Intl.DateTimeFormat('en-AU', { timeZone: TZ, day: '2-digit' }).format(new Date(ms))

// Step-style cumulative chart (design: "TV Slide 1 – GP Performance").
// Current (green) vs Last Year (blue) with a pulsing marker on today.
export default function GrossProfitChart({ items, emptyLabel }) {
  // emptyLabel lets the caller say WHY there is nothing to draw - "Awaiting Q4
  // data" is a very different message from "Chart loading…" on a wall display.
  if (!items) return <div className="placeholder">{emptyLabel || 'Chart loading…'}</div>

  const rows = chartSeries(items)
  if (rows.length < 2) return <div className="placeholder">{emptyLabel || 'No chart data yet'}</div>

  const W = 1180
  const H = 520

  const values = rows.flatMap((r) => [r.current, r.lastYear]).filter((v) => v != null)
  const dataMax = Math.max(...values)
  const maxY = dataMax <= 100 ? 100 : Math.ceil((dataMax * 1.1) / 10) * 10
  const x = (i) => (i / (rows.length - 1)) * W
  const y = (v) => H - (v / maxY) * H

  // Smooth curve (Catmull-Rom → cubic bézier). Control-point y is clamped
  // between the segment endpoints so the cumulative line never dips.
  const smooth = (key) => {
    const pts = []
    rows.forEach((r, i) => {
      if (r[key] != null) pts.push([x(i), y(r[key])])
    })
    if (!pts.length) return { d: '', firstX: null, lastX: null, lastY: null }
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[Math.min(pts.length - 1, i + 2)]
      const lo = Math.min(p1[1], p2[1])
      const hi = Math.max(p1[1], p2[1])
      const clamp = (v) => Math.min(hi, Math.max(lo, v))
      const c1x = p1[0] + (p2[0] - p0[0]) / 6
      const c1y = clamp(p1[1] + (p2[1] - p0[1]) / 6)
      const c2x = p2[0] - (p3[0] - p1[0]) / 6
      const c2y = clamp(p2[1] - (p3[1] - p1[1]) / 6)
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
    }
    return { d, firstX: pts[0][0], lastX: pts[pts.length - 1][0], lastY: pts[pts.length - 1][1] }
  }

  const ly = smooth('lastYear')
  const cur = smooth('current')
  const area = (s) =>
    s.d ? `${s.d} L ${s.lastX.toFixed(1)} ${H} L ${s.firstX.toFixed(1)} ${H} Z` : ''

  const gridStep = maxY / 5
  const grid = []
  for (let g = gridStep; g <= maxY; g += gridStep) grid.push(g)

  // Quarter month labels: "JUL 01", "AUG", "SEP", "SEP 30"
  const qStart = quarterStartUtc()
  const qEnd = quarterEndUtc()
  const mid1 = qStart + 31 * 86400000
  const mid2 = qStart + 62 * 86400000
  const axis = [`${monShort(qStart)} ${dayNum(qStart)}`, monShort(mid1), monShort(mid2), `${monShort(qEnd)} ${dayNum(qEnd)}`]

  return (
    <div className="fin2-chartwrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="fin2-chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id="curFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ADE97" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#4ADE97" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E7DD1" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#2E7DD1" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {grid.map((g) => (
          <g key={g}>
            <line x1="0" y1={y(g)} x2={W} y2={y(g)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x="8" y={y(g) - 8} className="fin2-grid-label">{g}%</text>
          </g>
        ))}
        <path d={area(ly)} fill="url(#lyFill)" />
        <path d={ly.d} fill="none" stroke="#2E7DD1" strokeWidth="3" strokeOpacity="0.85" />
        <path d={area(cur)} fill="url(#curFill)" />
        <path d={cur.d} fill="none" stroke="#4ADE97" strokeWidth="4.5" strokeLinejoin="round" />
        {cur.lastX != null && (
          <g>
            <line x1={cur.lastX} y1="0" x2={cur.lastX} y2={H} stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeDasharray="3 7" />
            <circle cx={cur.lastX} cy={cur.lastY} r="9" fill="#060B14" stroke="#4ADE97" strokeWidth="4" />
            <circle className="fin2-marker-ring" cx={cur.lastX} cy={cur.lastY} r="20" fill="none" stroke="#4ADE97" strokeWidth="1.5" strokeOpacity="0.4" />
          </g>
        )}
      </svg>
      <div className="fin2-axis">
        {axis.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="fin2-legend">
        <div><i style={{ background: '#4ADE97' }} /> Current</div>
        <div><i style={{ background: '#2E7DD1' }} /> Last Year</div>
      </div>
    </div>
  )
}
