import React from 'react'
import TvHeader from '../TvHeader.jsx'
import { hideOnError } from '../imgUtils.js'
import { useGsapReveal } from '../../useGsapReveal.js'

// "What's on your mind" status line — same full-bleed design as the
// Depth at Work photo slides (TV Slide 3 design).
export default function StatusSlide({ item }) {
  const reveal = useGsapReveal()
  if (!item) return null

  return (
    <div className="fin2 daw2" ref={reveal}>
      <div className="daw2-bg">
        {item.featured_image && (
          <img className="daw2-img kb-out" src={item.featured_image} alt="" onError={hideOnError} />
        )}
        <div className="daw2-scrim" />
      </div>

      <TvHeader title="Status Board" subtitle="What's On Our Mind" />

      <div className="daw2-body">
        <div className="daw2-block">
          <div className="daw2-tagrow" data-gsap="rise" data-gsap-delay="0.15">
            <i className="daw2-diamond" />
            <span className="daw2-tag">On the Ground</span>
          </div>
          <div className="daw2-title" data-gsap="words" data-gsap-delay="0.3">{item.title}</div>
          {item.description && <div className="daw2-caption" data-gsap="rise" data-gsap-delay="0.6">{item.description}</div>}
        </div>
      </div>
    </div>
  )
}
