import React, { useEffect, useState } from 'react'
import { quarterEndUtc } from '../logic/quarter.js'

const pad = (n) => String(n).padStart(2, '0')

// Navy "Quarter's End" countdown card (matches the original slide design).
export default function Countdown() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const target = quarterEndUtc(new Date(now))
  const diff = Math.max(0, target - now)
  const units = [
    [Math.floor(diff / 86400000), 'Days'],
    [Math.floor(diff / 3600000) % 24, 'Hours'],
    [Math.floor(diff / 60000) % 60, 'Minutes'],
    [Math.floor(diff / 1000) % 60, 'Seconds'],
  ]

  return (
    <div className="countdown-card">
      <h2 className="countdown-title">Quarter&rsquo;s End</h2>
      <div className="countdown-rule" />
      <div className="countdown-units">
        {units.map(([value, label], i) => (
          <React.Fragment key={label}>
            {i > 0 && <span className="countdown-sep">:</span>}
            <div className="countdown-unit">
              <span className="countdown-value">{pad(value)}</span>
              <span className="countdown-label">{label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
