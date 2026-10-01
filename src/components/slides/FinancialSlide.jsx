import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import GrossProfitChart from '../GrossProfitChart.jsx'
import TvHeader from '../TvHeader.jsx'
import { percentAchieved, targetComparison, chartSeries, isPreviousQuarterData } from '../../logic/bonus.js'
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

const CONFETTI_COLORS = ['#4ADE97', '#7CEBB6', '#2E7DD1', '#7AB4F0', '#FFFFFF']
const rand = (min, max) => min + Math.random() * (max - min)

// Celebration layer for the % Achieved card, mounted only at 100%+. Two sets of
// pieces, both pure CSS transform/opacity loops (no JS timers, no canvas, so the
// TV's GPU only composites): a slow fall across the card, and a splash out of
// the donut every 10s. Pieces are placed by measuring the card once, because
// the stage's scale transform does not affect offset* measurements.
function DonutConfetti() {
  const ref = useRef(null)
  const [box, setBox] = useState(null)

  useLayoutEffect(() => {
    const card = ref.current && ref.current.parentElement
    const donut = card && card.querySelector('.fin2-donut')
    if (!card || !donut) return
    setBox({
      height: card.offsetHeight,
      originY: donut.offsetTop + donut.offsetHeight / 2,
    })
  }, [])

  const pieces = useMemo(() => {
    const fall = Array.from({ length: 26 }, () => {
      const duration = rand(7, 12)
      return {
        left: `${rand(2, 98)}%`,
        w: rand(6, 11), h: rand(4, 7),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        duration, delay: -rand(0, duration),
        dx: rand(-40, 40), spin: rand(360, 900) * (Math.random() < 0.5 ? -1 : 1),
      }
    })
    const burst = Array.from({ length: 36 }, () => {
      const angle = -Math.PI / 2 + rand(-1.25, 1.25)
      const dist = rand(120, 230)
      return {
        w: rand(6, 11), h: rand(4, 7),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist,
        drop: rand(140, 260), spin: rand(360, 1080) * (Math.random() < 0.5 ? -1 : 1),
      }
    })
    return { fall, burst }
  }, [])

  return (
    <div className="fin2-confetti" ref={ref} aria-hidden="true">
      {box && pieces.fall.map((p, i) => (
        <i
          key={`f${i}`}
          className="fin2-cf-fall"
          style={{
            left: p.left, width: p.w, height: p.h, background: p.color,
            animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
            '--cf-y': `${box.height + 24}px`, '--cf-dx': `${p.dx}px`, '--cf-spin': `${p.spin}deg`,
          }}
        />
      ))}
      {box && pieces.burst.map((p, i) => (
        <i
          key={`b${i}`}
          className="fin2-cf-burst"
          style={{
            top: box.originY, width: p.w, height: p.h, background: p.color,
            '--cf-tx': `${p.tx}px`, '--cf-ty': `${p.ty}px`,
            '--cf-drop': `${p.ty + p.drop}px`, '--cf-spin': `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  )
}

function BonusDonut({ gp, onTrack, hit, paceLine, awaiting }) {
  // Awaiting data is not "behind pace": the red treatment would read as a bad
  // quarter rather than an absent one, so the line stays the muted default.
  const color = onTrack || hit ? GREEN : RED
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
      {hit && <DonutConfetti />}
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
      {paceLine && (
        <div className="fin2-pace" style={hit || awaiting ? undefined : { color }} data-gsap="rise" data-gsap-delay="0.6">
          {/* The pulse runs on an inner span: a CSS animation on the outer div
              would override GSAP's inline transform and kill the rise reveal. */}
          {hit ? <span className="fin2-hit">{paceLine}</span> : paceLine}
        </div>
      )}
    </div>
  )
}

// "TV Slide 1 – GP Performance" design, wired to live data.
export default function FinancialSlide({ grossProfit, jobs }) {
  // Azure keeps serving the finished quarter after the calendar has moved on
  // (see isPreviousQuarterData). Treat that as no data rather than plotting it
  // against the new quarter's axis - every figure below is quarter-scoped, so
  // they all go together, and the slide says what it is waiting for.
  const stale = isPreviousQuarterData(grossProfit)
  const gpData = stale ? null : grossProfit

  const gp = gpData ? percentAchieved(gpData) : null
  const cmp = gpData ? targetComparison(gpData) : null
  const onTrack = cmp ? cmp.onTrack : false

  // Last Year's value at today's position on the chart.
  const rows = gpData ? chartSeries(gpData) : []
  let lyAtToday = null
  rows.forEach((r) => {
    if (r.current != null && r.lastYear != null) lyAtToday = r.lastYear
  })
  const delta = gp != null && lyAtToday != null ? Math.round(gp - lyAtToday) : null

  const jc = jobsComparison(jobs)
  const reveal = useGsapReveal()

  // Target reached: judged on the same rounded figure the donut displays, so
  // "100%" on screen always comes with the confetti and the "hit" wording.
  const hit = gp != null && Math.round(gp) >= 100

  const qName = quarterLabel().split(' ')[0]

  const paceLine = stale
    ? `Awaiting ${qName} data`
    : hit
      ? 'We hit the target!'
      : cmp
        ? cmp.onTrack
          ? 'Ahead of target pace'
          : 'Behind target pace'
        : null

  const tickerItems = [
    stale && <span key="await">AWAITING {qName} FIGURES</span>,
    delta != null
      ? delta >= 0
        ? <span key="gp"><span className="up">▲</span>&nbsp; GP {Math.round(gp)}% — {delta} PTS AHEAD OF LAST YEAR</span>
        : <span key="gp"><span className="down">▼</span>&nbsp; GP {Math.round(gp)}% — {-delta} PTS BEHIND LAST YEAR</span>
      : gp != null && <span key="gp">GP {Math.round(gp)}% THIS QUARTER</span>,
    jc && <span key="jobs">{jc.current} {jc.current === 1 ? 'JOB' : 'JOBS'} BOOKED THIS MONTH</span>,
    gp != null && (hit
      ? <span key="togo"><span className="up">TARGET HIT</span>&nbsp; — EVERY JOB STILL COUNTS</span>
      : <span key="togo"><span className="up">{Math.max(0, 100 - Math.round(gp))}%</span>&nbsp; TO GO — EVERY JOB COUNTS</span>),
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
          <GrossProfitChart items={gpData} emptyLabel={stale ? `Awaiting ${qName} data` : undefined} />
        </div>

        <div className="fin2-right">
          <CountdownCard />
          <BonusDonut gp={gp} onTrack={onTrack} hit={hit} paceLine={paceLine} awaiting={stale} />
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
