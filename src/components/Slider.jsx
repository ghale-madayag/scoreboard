import React, { useEffect, useRef, useState } from 'react'

// Full-screen slide rotator with a cinematic zoom-fade transition.
//
// Uses two fixed DOM slots that alternate between "active" and "leaving".
// The slot elements never move or remount — only their class and children
// change — so the CSS exit transition on the outgoing slot actually runs
// (reordering keyed siblings would make React move the node, which cancels
// transitions). Only two slides are ever mounted (Puffin memory hygiene).
//
// `slides` is an array of { key, duration?, render }.
export default function Slider({ slides, defaultDuration = 12000 }) {
  const [state, setState] = useState({ index: 0, activeSlot: 0, hasPrev: false })
  const count = slides.length
  const index = count ? state.index % count : 0
  const current = slides[index]
  const previous = state.hasPrev ? slides[(index - 1 + count) % count] : null
  const duration = current?.duration ?? defaultDuration

  useEffect(() => {
    if (count < 2) return
    const t = setTimeout(() => {
      setState((s) => ({
        index: (s.index + 1) % count,
        activeSlot: 1 - s.activeSlot,
        hasPrev: true,
      }))
    }, duration)
    return () => clearTimeout(t)
  }, [state.index, count, duration])

  // If the slide list shrinks (data change), clamp the index.
  useEffect(() => {
    if (state.index >= count && count > 0) {
      setState({ index: 0, activeSlot: 0, hasPrev: false })
    }
  }, [count, state.index])

  // Jump straight to a slide (dot click); also restarts the auto-advance timer.
  const goTo = (i) => {
    setState((s) => {
      if (i === s.index % count) return s
      return { index: i, activeSlot: 1 - s.activeSlot, hasPrev: true }
    })
  }

  if (!count || !current) return null

  const slots = [null, null]
  slots[state.activeSlot] = { slide: current, cls: 'active' }
  slots[1 - state.activeSlot] = previous ? { slide: previous, cls: 'leaving' } : null

  return (
    <div className="slider">
      {slots.map((slot, si) => (
        <div key={si} className={`slider-slide ${slot ? slot.cls : 'idle'}`}>
          {slot && (
            <React.Fragment key={slot.slide.key}>{slot.slide.render()}</React.Fragment>
          )}
        </div>
      ))}
      <div
        key={`progress-${current.key}-${index}`}
        className="slide-progress"
        style={{ animationDuration: `${duration}ms` }}
      />
      <div className="slider-dots">
        {slides.map((s, i) => (
          <button
            key={s.key}
            type="button"
            className={`dot ${i === index ? 'active' : ''}`}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  )
}
