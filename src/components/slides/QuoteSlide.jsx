import React from 'react'
import TvHeader from '../TvHeader.jsx'
import { hideOnError } from '../imgUtils.js'
import { useGsapReveal } from '../../useGsapReveal.js'
import quoteBackdrop from '../../assets/quote-backdrop.jpg'

// "TV Slide 2 – Quote" design: full-bleed photo with gradient scrims,
// quote block bottom-left, values strip along the bottom.
export default function QuoteSlide({ item }) {
  const reveal = useGsapReveal()
  if (!item) return null

  // Two treatments:
  //  - attributed quote → portrait of that person, framed on the right so the
  //    face is never cropped and always matches the name shown underneath
  //  - unattributed maxim → full-bleed freight backdrop (its left third is
  //    deliberately dark and empty, which is where the quote text sits)
  const portrait = item.authorImage || null
  const photo = item.background_image || quoteBackdrop

  return (
    <div className={`fin2 quote2 ${portrait ? 'quote2-portrait' : ''}`} ref={reveal}>
      <div className="quote2-bg">
        {portrait ? (
          <>
            <img className="quote2-face" src={portrait} alt={item.author || ''} onError={hideOnError} />
            <div className="quote2-face-fade" />
          </>
        ) : (
          <>
            <img className="quote2-img kb-in" src={photo} alt="" onError={hideOnError} />
            <div className="quote2-scrim" />
          </>
        )}
      </div>

      <TvHeader title="Focus of the Week" subtitle="Mindset · Depth Logistics" />

      <div className="quote2-body">
        <div className="quote2-block">
          <div className="quote2-mark" data-gsap="rise" data-gsap-delay="0.15">&ldquo;</div>
          <div className="quote2-text" data-gsap="words" data-gsap-delay="0.3">{item.quotes}</div>
          {item.author && (
            <div className="quote2-attrib" data-gsap="rise" data-gsap-delay="1">
              <div className="quote2-rule" />
              <div className="quote2-author">{item.author}</div>
            </div>
          )}
        </div>
      </div>

      <div className="quote2-footer" data-gsap="rise" data-gsap-delay="1.1">
        <span className="g">◆</span>
        <span>ABSOLUTE RELIABILITY</span>
        <span className="dim">◆</span>
        <span>ONE TEAM · ONE TARGET</span>
        <span className="g">◆</span>
      </div>
    </div>
  )
}
