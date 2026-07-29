import React from 'react'
import TvHeader from '../TvHeader.jsx'
import { useGsapReveal } from '../../useGsapReveal.js'

// "TV Slide 4 – Ideas Winner" design. Deliberately no winner name or
// photo — the teaser sends the team to the intranet to find out.
export default function WinnerSlide({ item }) {
  const reveal = useGsapReveal()
  if (!item) return null

  return (
    <div className="fin2 win2" ref={reveal}>
      <div className="win2-bg" />
      <div className="fin2-topbar" />
      <i className="win2-confetti c1" />
      <i className="win2-confetti c2" />
      <i className="win2-confetti c3" />
      <i className="win2-confetti c4" />
      <i className="win2-confetti c5" />

      <TvHeader title="Ideas Program" subtitle="Your Ideas · Our Edge" />

      <div className="win2-main">
        <div className="win2-left">
          <div className="win2-weekrow" data-gsap="rise" data-gsap-delay="0.1">
            <i className="win2-rule" />
            <span className="win2-week">Week {item._week} — {item._month} Ideas Winner</span>
          </div>
          <h1 className="win2-title" data-gsap="words" data-gsap-delay="0.25">{item._subject}</h1>
          <div data-gsap="rise" data-gsap-delay="0.7">
            <span className="win2-cta">Submit your idea this week</span>
          </div>
        </div>

        <div className="win2-right">
          <div className="win2-card">
            <span className="card-beam b1" aria-hidden="true" />
            <div className="win2-mark" data-gsap="rise" data-gsap-delay="0.3">&ldquo;</div>
            <div className="win2-text" data-gsap="rise" data-gsap-delay="0.45">{item._descriptions}</div>
            <div className="win2-teaser" data-gsap="rise" data-gsap-delay="0.65">
              <i className="win2-diamond" />
              <span>Curious who won? Check the intranet to find out!</span>
            </div>
          </div>
        </div>
      </div>

      <div className="quote2-footer win2-footer" data-gsap="rise" data-gsap-delay="0.85">
        <span className="g">◆</span>
        <span>GOT AN IDEA? SUBMIT IT THIS WEEK</span>
        <span className="dim">◆</span>
        <span>EVERY IDEA GETS READ</span>
        <span className="g">◆</span>
      </div>
    </div>
  )
}
