import React from 'react'
import logo from '../assets/logo.png'

// Shared slide header: logo, section title, live Sydney date with pulse dot.
export default function TvHeader({ title, subtitle }) {
  const todayLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Australia/Sydney',
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date()).toUpperCase()

  return (
    <div className="fin2-head">
      <div className="fin2-brand">
        <img className="fin2-logo" src={logo} alt="Depth Logistics" />
        <div className="fin2-brand-divider" />
        <div>
          <div className="fin2-title" data-gsap="words" data-gsap-delay="0.1">{title}</div>
          <div className="fin2-subtitle" data-gsap="rise" data-gsap-delay="0.3">{subtitle}</div>
        </div>
      </div>
      <div className="fin2-live">
        <div className="fin2-live-dot" />
        <div className="fin2-live-date" data-gsap="rise" data-gsap-delay="0.4">{todayLabel}</div>
      </div>
    </div>
  )
}
