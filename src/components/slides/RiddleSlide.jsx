import React from 'react'
import TvHeader from '../TvHeader.jsx'
import { hideOnError } from '../imgUtils.js'
import { useGsapReveal } from '../../useGsapReveal.js'

// The design sets the riddle at 54px; step down for longer questions
// so they never crowd the "Yesterday's Answer" card below.
function riddleSize(text = '') {
  const n = text.length
  if (n <= 120) return 54
  if (n <= 190) return 46
  if (n <= 260) return 40
  return 34
}

// "TV Slide 9 – Brain Challenge" design.
export default function RiddleSlide({ item }) {
  const reveal = useGsapReveal()
  if (!item) return null

  const question = item._question?.trim()
  const image = item.featured_question

  return (
    <div className="fin2 bc2" ref={reveal}>
      <div className="gf2-bg" />
      <div className="fin2-topbar" />

      <TvHeader title="Brain Challenge" subtitle="Riddle of the Day · Depth Trivia" />

      <div className="gf2-main">
        {image && (
          <div className="bc2-img-wrap">
            <div className="bc2-outline" />
            <div className="bc2-img">
              <img src={image} alt="Brain challenge" onError={hideOnError} />
            </div>
            <div className="gf2-qmark">?</div>
          </div>
        )}

        <div className="gf2-right">
          <div className="win2-weekrow" data-gsap="rise" data-gsap-delay="0.1">
            <i className="win2-rule" />
            <span className="win2-week">Riddle of the Day</span>
          </div>
          {question && (
            <div className="bc2-question" style={{ fontSize: `${riddleSize(question)}px` }} data-gsap="words" data-gsap-delay="0.25">
              {question}
            </div>
          )}
          {item._yesterday_answer_in_text && (
            <div className="gf2-prev" data-gsap="rise" data-gsap-delay="0.9">
              <span className="card-beam b2" aria-hidden="true" />
              <i className="win2-diamond" />
              <div>
                <div className="gf2-prev-k">Yesterday&rsquo;s Answer</div>
                <div className="gf2-prev-country">{item._yesterday_answer_in_text}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="quote2-footer win2-footer" data-gsap="rise" data-gsap-delay="1.05">
        <span className="g">◆</span>
        <span>THINK YOU KNOW? TELL YOUR TEAM</span>
        <span className="dim">◆</span>
        <span>ANSWER ON TOMORROW&rsquo;S SLIDE</span>
        <span className="g">◆</span>
      </div>
    </div>
  )
}
