import React from 'react'
import TvHeader from '../TvHeader.jsx'
import { hideOnError } from '../imgUtils.js'
import { useGsapReveal } from '../../useGsapReveal.js'

// The design sets the term at 170px, which only fits short acronyms
// ("FME", "GOAT"). Step it down for longer words ("Prognosticate").
function termSize(word = '') {
  const n = word.length
  if (n <= 4) return 170
  if (n <= 6) return 148
  if (n <= 9) return 116
  if (n <= 13) return 90
  return 68
}

// "TV Slide 8 – Term of the Day" design.
export default function TermSlide({ item }) {
  const reveal = useGsapReveal()
  if (!item) return null

  const image = item.background_image

  return (
    <div className="fin2 tod2" ref={reveal}>
      <div className="gf2-bg" />

      <TvHeader title="Term of the Day" subtitle="Know Your Freight · Depth Trivia" />

      <div className="gf2-main">
        {image && (
          <div className="tod2-img-wrap">
            <div className="tod2-outline" />
            <div className="tod2-img">
              <img decoding="async" src={image} alt={item.word} onError={hideOnError} />
            </div>
          </div>
        )}

        <div className="gf2-right">
          <div className="win2-weekrow" data-gsap="rise" data-gsap-delay="0.1">
            <i className="win2-rule" />
            <span className="win2-week">Term of the Day</span>
          </div>
          <div className="tod2-term" style={{ fontSize: `${termSize(item.word)}px` }} data-gsap="chars" data-gsap-delay="0.3">
            {item.word}
          </div>
          {item.descriptions && <div className="tod2-meaning" data-gsap="words" data-gsap-delay="0.65">{item.descriptions}</div>}
        </div>
      </div>

      <div className="quote2-footer win2-footer" data-gsap="rise" data-gsap-delay="0.9">
        <span className="g">◆</span>
        <span>NEW TERM EVERY DAY</span>
        <span className="dim">◆</span>
        <span>KNOW YOUR FREIGHT</span>
        <span className="g">◆</span>
      </div>
    </div>
  )
}
