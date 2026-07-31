import React, { useEffect, useState } from 'react'
import GrossProfitChart from '../GrossProfitChart.jsx'
import TvHeader from '../TvHeader.jsx'
import { percentAchieved, targetComparison, chartSeries } from '../../logic/bonus.js'
import { jobsComparison } from '../../logic/jobs.js'
import { quarterEndUtc, quarterLabel } from '../../logic/quarter.js'
import { useCountUp } from '../../useCountUp.js'
import { useGsapReveal } from '../../useGsapReveal.js'

const GREEN = '#4ADE97'
const RED = '#F0836B'
const pad = (n) => String(n).padStart(2, '0')

function CountdownCard() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const diff = Math.max(0, quarterEndUtc(new Date(now)) - now)
  const units = [
    [pad(Math.floor(diff / 86400000)), 'DAYS', false],
    [pad(Math.floor(diff / 3600000) % 24), 'HRS', false],
    [pad(Math.floor(diff / 60000) % 60), 'MIN', false],
    [pad(Math.floor(diff / 1000) % 60), 'SEC', true],
  ]
  return (
    <div className="fin2-cd">
      <span className="card-beam" aria-hidden="true" />
      <div className="fin2-panel-title" data-gsap="words" data-gsap-delay="0.2">Quarter Ends In</div>
      <div className="fin2-cd-grid">
        {units.map(([v, label, green]) => (
          <div className="fin2-cd-cell" key={label}>
            <div className={`fin2-cd-num ${green ? 'green' : ''}`}>{v}</div>
            <div className="fin2-cd-unit">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BonusDonut({ gp, onTrack, paceLine }) {
  const color = onTrack ? GREEN : RED
  const r = 86
  const c = 2 * Math.PI * r
  const frac = gp != null ? Math.min(1, Math.max(0, gp / 100)) : 0
  const [sweep, setSweep] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setSweep(frac), 350)
    return () => clearTimeout(t)
  }, [frac])
  const shown = useCountUp(gp, 1400, 350)

  return (
    <div className="fin2-bonus">
      <span className="card-beam b2" aria-hidden="true" />
      <div className="fin2-panel-title" data-gsap="words" data-gsap-delay="0.25">% Achieved</div>
      <div className="fin2-donut">
        <svg viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="16" />
          <circle
            cx="100" cy="100" r={r}
            fill="none" stroke={color} strokeWidth="16" strokeLinecap={sweep > 0 ? 'round' : 'butt'}
            strokeDasharray={`${sweep * c} ${c}`}
            style={{
              // Tight, low-alpha glow. A wide one (this was 10px at 0.5) reads
              // as a blurry halo bleeding past the ring, and an SVG drop-shadow
              // re-filters the arc every frame of the sweep, which the TV's GPU
              // does not enjoy.
              filter: `drop-shadow(0 0 4px ${onTrack ? 'rgba(74,222,151,0.3)' : 'rgba(240,131,107,0.3)'})`,
              transition: 'stroke-dasharray 1.4s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </svg>
        <div className="fin2-donut-center">
          <div className="fin2-donut-num">{shown != null ? `${Math.round(shown)}%` : '–'}</div>
          <div className="fin2-donut-sub">OF TARGET</div>
        </div>
      </div>
      <div className="fin2-bonus-caption" data-gsap="rise" data-gsap-delay="0.45">Bonus Target as of Today</div>
      {paceLine && <div className="fin2-pace" style={{ color }} data-gsap="rise" data-gsap-delay="0.6">{paceLine}</div>}
    </div>
  )
}

// "TV Slide 1 – GP Performance" design, wired to live data.
export default function FinancialSlide({ grossProfit, jobs }) {
  const gp = grossProfit ? percentAchieved(grossProfit) : null
  const cmp = grossProfit ? targetComparison(grossProfit) : null
  const onTrack = cmp ? cmp.onTrack : false

  // Last Year's value at today's position on the chart.
  const rows = grossProfit ? chartSeries(grossProfit) : []
  let lyAtToday = null
  rows.forEach((r) => {
    if (r.current != null && r.lastYear != null) lyAtToday = r.lastYear
  })
  const delta = gp != null && lyAtToday != null ? Math.round(gp - lyAtToday) : null

  const jc = jobsComparison(jobs)
  const reveal = useGsapReveal()

  const paceLine = cmp
    ? cmp.onTrack
      ? 'Ahead of target pace'
      : 'Behind target pace'
    : null

  const qName = quarterLabel().split(' ')[0]

  const tickerItems = [
    delta != null
      ? delta >= 0
        ? <span key="gp"><span className="up">▲</span>&nbsp; GP {Math.round(gp)}% — {delta} PTS AHEAD OF LAST YEAR</span>
        : <span key="gp"><span className="down">▼</span>&nbsp; GP {Math.round(gp)}% — {-delta} PTS BEHIND LAST YEAR</span>
      : gp != null && <span key="gp">GP {Math.round(gp)}% THIS QUARTER</span>,
    jc && <span key="jobs">{jc.current} JOBS BOOKED THIS MONTH</span>,
    gp != null && <span key="togo"><span className="up">{Math.max(0, 100 - Math.round(gp))}%</span>&nbsp; TO GO — EVERY JOB COUNTS</span>,
    <span key="brand">ABSOLUTE RELIABILITY</span>,
  ].filter(Boolean)

  const tickerGroup = (
    <div className="fin2-ticker-group">
      {tickerItems.map((item, i) => (
        <React.Fragment key={i}>{item}<span className="diamond">◆</span></React.Fragment>
      ))}
    </div>
  )

  return (
    <div className="fin2" ref={reveal}>
      <div className="fin2-bg" />
      <div className="fin2-topbar" />

      <TvHeader title={`${qName} Performance`} subtitle="Gross Profit · vs Last Year" />

      <div className="fin2-main">
        <div className="fin2-left">
          <div className="fin2-hero">
            <div className="fin2-cards">
              {lyAtToday != null && (
                <div className="fin2-card">
                  <span className="card-beam b1" aria-hidden="true" />
                  <div className="fin2-card-k" data-gsap="rise" data-gsap-delay="0.25">vs Last Year</div>
                  <div className="fin2-card-row" data-gsap="rise" data-gsap-delay="0.35">
                    <span className="fin2-card-v">{Math.round(lyAtToday)}%</span>
                    {delta != null && (
                      <span className={`fin2-card-delta ${delta >= 0 ? 'up' : 'down'}`}>
                        {delta >= 0 ? '▲' : '▼'} {delta >= 0 ? '+' : '−'}{Math.abs(delta)} pts
                      </span>
                    )}
                  </div>
                </div>
              )}
              {jc && (
                <div className="fin2-card">
                  <span className="card-beam b3" aria-hidden="true" />
                  <div className="fin2-card-k" data-gsap="rise" data-gsap-delay="0.35">Jobs Booked</div>
                  <div className="fin2-card-row" data-gsap="rise" data-gsap-delay="0.45">
                    <span className="fin2-card-v">{jc.current}</span>
                    {jc.lastYear != null && <span className="fin2-card-ly">/ {jc.lastYear} LY</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
          <GrossProfitChart items={grossProfit} />
        </div>

        <div className="fin2-right">
          <CountdownCard />
          <BonusDonut gp={gp} onTrack={onTrack} paceLine={paceLine} />
        </div>
      </div>

      <div className="fin2-ticker">
        <div className="fin2-ticker-track">
          {tickerGroup}
          {tickerGroup}
        </div>
      </div>
    </div>
  )
}
