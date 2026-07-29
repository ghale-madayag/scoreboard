import React, { useEffect, useState } from 'react'
import TvHeader from '../TvHeader.jsx'
import { useCountUp } from '../../useCountUp.js'
import { useGsapReveal } from '../../useGsapReveal.js'

// "TV Slide 10 – Promises Tracker" design.
// The ring fills with completed/total; the centre shows how many are
// left before the bonus unlocks.
export default function PromisesSlide({ item }) {
  if (!item) return null

  const total = item._total != null ? Number(item._total) : null
  const completed = item._completed != null ? Number(item._completed) : null
  const remaining =
    item._remaining != null
      ? Number(item._remaining)
      : total != null && completed != null
        ? total - completed
        : null

  const frac = total > 0 && completed != null ? Math.min(1, completed / total) : 0
  const [sweep, setSweep] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setSweep(frac), 400)
    return () => clearTimeout(t)
  }, [frac])

  const shown = useCountUp(remaining, 1600, 400)
  const reveal = useGsapReveal()
  const r = 88
  const c = 2 * Math.PI * r

  return (
    <div className="fin2 pr2" ref={reveal}>
      <div className="pr2-bg" />
      <div className="fin2-topbar" />
      <i className="win2-confetti p1" />
      <i className="win2-confetti p2" />
      <i className="win2-confetti p3" />
      <i className="win2-confetti p4" />
      <i className="win2-confetti p5" />

      <TvHeader title="Bonus Tracker" subtitle="Promises Kept · Team Goal" />

      <div className="pr2-main">
        <div className="pr2-ring">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="13" />
            <circle
              cx="100" cy="100" r={r}
              fill="none" stroke="#4ADE97" strokeWidth="13"
              strokeLinecap={sweep > 0 ? 'round' : 'butt'}
              strokeDasharray={`${sweep * c} ${c}`}
              style={{
                filter: 'drop-shadow(0 0 12px rgba(74,222,151,0.5))',
                transition: 'stroke-dasharray 1.6s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </svg>
          <div className="pr2-ring-center">
            <div className="pr2-remaining">{shown != null ? Math.round(shown) : '–'}</div>
            <div className="pr2-remaining-label" data-gsap="rise" data-gsap-delay="0.4">Promises Left<br />to Bonus</div>
          </div>
        </div>

        <div className="pr2-right">
          <div className="win2-weekrow" data-gsap="rise" data-gsap-delay="0.1">
            <i className="win2-rule" />
            <span className="win2-week">Team Goal</span>
          </div>
          <div className="pr2-headline" data-gsap="words" data-gsap-delay="0.25">Every promise kept gets us closer.</div>
          {total != null && completed != null && (
            <div className="pr2-progress" data-gsap="rise" data-gsap-delay="0.55">
              <div className="pr2-progress-row">
                <span className="pr2-progress-k">Progress</span>
                <span className="pr2-progress-v">
                  {completed} <span className="pr2-progress-of">of {total} completed</span>
                </span>
              </div>
              <div className="pr2-bar">
                <div className="pr2-bar-fill" style={{ width: `${(sweep * 100).toFixed(1)}%` }} />
              </div>
            </div>
          )}
          {total != null && (
            <div className="pr2-subline" data-gsap="rise" data-gsap-delay="0.75">
              Log each kept promise with your team lead — the ring fills as we go.
              Bonus unlocks at {total}.
            </div>
          )}
        </div>
      </div>

      <div className="quote2-footer win2-footer" data-gsap="rise" data-gsap-delay="0.95">
        <span className="g">◆</span>
        <span>A PROMISE MADE IS A PROMISE KEPT</span>
        <span className="dim">◆</span>
        <span>ABSOLUTE RELIABILITY</span>
        <span className="g">◆</span>
      </div>
    </div>
  )
}
