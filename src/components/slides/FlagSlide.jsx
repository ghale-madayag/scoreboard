import React from 'react'
import TvHeader from '../TvHeader.jsx'
import { useGsapReveal } from '../../useGsapReveal.js'

// "TV Slide 7 – Guess the Flag" design.
export default function FlagSlide({ item }) {
  const reveal = useGsapReveal()
  if (!item) return null

  return (
    <div className="fin2 gf2" ref={reveal}>
      <div className="gf2-bg" />
      <div className="fin2-topbar" />

      <TvHeader title="Daily Challenge" subtitle="Around the World · Depth Trivia" />

      <div className="gf2-main">
        <div className="gf2-flag-wrap">
          <div className="gf2-flag-outline" />
          <div className="gf2-flag" style={{ backgroundImage: `url(${item.flag_image})` }} />
          <div className="gf2-qmark">?</div>
        </div>

        <div className="gf2-right">
          <div className="win2-weekrow" data-gsap="rise" data-gsap-delay="0.1">
            <i className="win2-rule" />
            <span className="win2-week">Daily Challenge</span>
          </div>
          <h1 className="gf2-title" data-gsap="chars" data-gsap-delay="0.25">Guess the Flag</h1>
          <div className="gf2-hint" data-gsap="words" data-gsap-delay="0.6">
            Know it? Shout it out — answer revealed on tomorrow&rsquo;s slide.
          </div>
          {(item._yesterday_answer_in_text || item._yesterday_answer_in_image) && (
            <div className="gf2-prev" data-gsap="rise" data-gsap-delay="0.9">
              <span className="card-beam b2" aria-hidden="true" />
              {item._yesterday_answer_in_image && (
                <div
                  className="gf2-prev-flag"
                  style={{ backgroundImage: `url(${item._yesterday_answer_in_image})` }}
                />
              )}
              <div>
                <div className="gf2-prev-k">Yesterday&rsquo;s Answer</div>
                {item._yesterday_answer_in_text && (
                  <div className="gf2-prev-country">{item._yesterday_answer_in_text}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="quote2-footer win2-footer" data-gsap="rise" data-gsap-delay="1.05">
        <span className="g">◆</span>
        <span>WE DELIVER THERE TOO</span>
        <span className="dim">◆</span>
        <span>ANSWER ON TOMORROW&rsquo;S SLIDE</span>
        <span className="g">◆</span>
      </div>
    </div>
  )
}
