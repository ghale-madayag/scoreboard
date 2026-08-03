import React from 'react'
import TvHeader from '../TvHeader.jsx'
import { useGsapReveal } from '../../useGsapReveal.js'

const sydneyYear = () =>
  new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric' }).format(new Date())

// "TV Slide 6 – Mission Possible" design for the featured project.
// The IM̶POSSIBLE stamp treatment applies when the title is "Mission
// Possible"; any other featured project title renders plainly in the stamp.
export default function ProjectSlide({ item }) {
  const reveal = useGsapReveal()
  if (!item) return null

  const isMission = /mission\s+possible/i.test(item._title || '')

  return (
    <div className="fin2 mp2" ref={reveal}>
      <div className="mp2-bg" />

      <TvHeader title="Featured Project" subtitle={`${sydneyYear()} · Company Mission`} />

      <div className="mp2-main">
        <div className="mp2-stamp">
          {isMission ? (
            <>
              <div className="mp2-label">Mission:</div>
              <div className="mp2-word-row">
                <span className="mp2-im">IM<i className="mp2-strike" /></span>
                <span className="mp2-possible">POSSIBLE</span>
              </div>
            </>
          ) : (
            <div className="mp2-plain-title">{item._title}</div>
          )}
        </div>

        {item._description && (
          <div className="mp2-text-wrap">
            <div className="mp2-text" data-gsap="words" data-gsap-delay="0.5">{item._description}</div>
          </div>
        )}

        <div className="mp2-pills" data-gsap="rise" data-gsap-delay="0.8">
          <span className="mp2-pill no">&ldquo;NO&rdquo;</span>
          <span className="mp2-pill no">&ldquo;CAN&rsquo;T&rdquo;</span>
          <span className="mp2-pill no">&ldquo;IMPOSSIBLE&rdquo;</span>
          <span className="mp2-pill yes">SAFE &amp; SECURE — DONE ✓</span>
        </div>
      </div>

      <div className="quote2-footer win2-footer" data-gsap="rise" data-gsap-delay="1">
        <span className="g">◆</span>
        <span>WE FIND A WAY</span>
        <span className="dim">◆</span>
        <span>ABSOLUTE RELIABILITY</span>
        <span className="g">◆</span>
      </div>
    </div>
  )
}
