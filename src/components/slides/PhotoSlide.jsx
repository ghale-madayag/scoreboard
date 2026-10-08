import React from 'react'
import TvHeader from '../TvHeader.jsx'
import { hideOnError } from '../imgUtils.js'
import { useGsapReveal } from '../../useGsapReveal.js'

// "TV Slide 3 – Depth at Work" design: full-bleed photo with scrims,
// tag + title + caption bottom-left. Ken Burns kept from the old slide.
// `kb` picks the Ken Burns variant so consecutive photos move differently.
export default function PhotoSlide({ photo, kb = 'kb-in' }) {
  const reveal = useGsapReveal()
  if (!photo) return null

  return (
    <div className="fin2 daw2" ref={reveal}>
      <div className="daw2-bg">
        <img decoding="async"
          className={`daw2-img ${kb}`}
          src={photo.src}
          alt={photo.title || 'Depth at Work'}
          onError={hideOnError}
        />
        <div className="daw2-scrim" />
      </div>

      <TvHeader title="Depth at Work" subtitle="Field Stories · On the Ground" />

      <div className="daw2-body">
        <div className="daw2-block">
          {photo.tag && (
            <div className="daw2-tagrow" data-gsap="rise" data-gsap-delay="0.15">
              <i className="daw2-diamond" />
              <span className="daw2-tag">{photo.tag}</span>
            </div>
          )}
          {photo.title && <div className="daw2-title" data-gsap="words" data-gsap-delay="0.3">{photo.title}</div>}
          {photo.desc && <div className="daw2-caption" data-gsap="rise" data-gsap-delay="0.6">{photo.desc}</div>}
        </div>
      </div>
    </div>
  )
}
