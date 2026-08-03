import React from 'react'
import TvHeader from '../TvHeader.jsx'
import { hideOnError } from '../imgUtils.js'
import { useGsapReveal } from '../../useGsapReveal.js'

// The company core values, in order: they spell DEPTH.
const CORE_VALUES = ['DEPENDABLE', 'EXCELLENCE', 'PERSONALISED', 'TENACIOUS', 'HONEST']

// "TV Slide 5 – Core Values Award" design.
export default function AwardeeSlide({ item }) {
  const reveal = useGsapReveal()
  if (!item) return null

  return (
    <div className="fin2 aw2" ref={reveal}>
      <div className="aw2-bg" />
      <i className="win2-confetti a1" />
      <i className="win2-confetti a2" />
      <i className="win2-confetti a3" />
      <i className="win2-confetti a4" />

      <TvHeader title="Core Values Award" subtitle="People · Recognition" />

      <div className="aw2-main">
        <div className="aw2-portrait-col">
          <div className="aw2-photo-wrap">
            <div className="aw2-ring" />
            <div className="aw2-photo">
              {item._profile_image && (
                <img src={item._profile_image} alt={item._employee_name} onError={hideOnError} />
              )}
            </div>
            <div className="aw2-star">★</div>
          </div>
          <div className="aw2-id">
            <div className="aw2-name" data-gsap="chars" data-gsap-delay="0.4">{item._employee_name}</div>
            <div className="aw2-role" data-gsap="rise" data-gsap-delay="0.7">{item._position}</div>
          </div>
        </div>

        <div className="aw2-right">
          <div className="win2-weekrow" data-gsap="rise" data-gsap-delay="0.15">
            <i className="win2-rule" />
            <span className="win2-week">{item.date} Core Values Awardee</span>
          </div>
          <div className="aw2-citation" data-gsap="rise" data-gsap-delay="0.35">{item._descriptions}</div>
          <div className="aw2-pills" data-gsap="rise" data-gsap-delay="0.6">
            {CORE_VALUES.map((v) => (
              <span className="aw2-pill" key={v}>{v}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="quote2-footer win2-footer" data-gsap="rise" data-gsap-delay="0.8">
        <span className="g">◆</span>
        <span>ON TIME · ON BUDGET · SAFE · SECURE</span>
        <span className="dim">◆</span>
        <span>CONGRATULATIONS FROM THE WHOLE TEAM</span>
        <span className="g">◆</span>
      </div>
    </div>
  )
}
