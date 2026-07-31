import React, { useEffect, useMemo, useState } from 'react'
import { useScoreboardData } from './useScoreboardData.js'
import { resolveQuote } from './logic/logisticsQuotes.js'
import Slider from './components/Slider.jsx'
import FinancialSlide from './components/slides/FinancialSlide.jsx'
import QuoteSlide from './components/slides/QuoteSlide.jsx'
import AwardeeSlide from './components/slides/AwardeeSlide.jsx'
import WinnerSlide from './components/slides/WinnerSlide.jsx'
import ProjectSlide from './components/slides/ProjectSlide.jsx'
import FlagSlide from './components/slides/FlagSlide.jsx'
import TermSlide from './components/slides/TermSlide.jsx'
import RiddleSlide from './components/slides/RiddleSlide.jsx'
import PromisesSlide from './components/slides/PromisesSlide.jsx'
import StatusSlide from './components/slides/StatusSlide.jsx'
import PhotoSlide from './components/slides/PhotoSlide.jsx'

// Scale the fixed 1920×1080 design to whatever viewport the TV reports.
// Always a UNIFORM scale — never stretched, circles stay circles:
// - near-16:9 viewports: COVER the screen (no bars); the small excess is
//   cropped from the TOP edge only, so the progress bar / dots at the
//   bottom always stay visible
// - very odd ratios (crop would exceed ~10%): fall back to contain (bars)
//   rather than cutting real content
// documentElement.clientWidth/Height is the layout viewport and is the value TV
// browsers get right most often; window.innerWidth can include browser chrome or
// report a stale desktop-sized value. Take the smaller of the two so a viewport
// that is over-reported never scales the board up past the panel.
function viewport() {
  const de = document.documentElement
  const vw = Math.min(de?.clientWidth || Infinity, window.innerWidth || Infinity)
  const vh = Math.min(de?.clientHeight || Infinity, window.innerHeight || Infinity)
  return {
    vw: Number.isFinite(vw) && vw > 0 ? vw : 1920,
    vh: Number.isFinite(vh) && vh > 0 ? vh : 1080,
  }
}

function useFitTransform() {
  const [t, setT] = useState({ s: 1, x: 0, y: 0, vw: 0, vh: 0 })
  useEffect(() => {
    let raf = 0
    let settleTimer = 0
    let stableFor = 0
    let last = { vw: 0, vh: 0 }

    const apply = () => {
      const { vw, vh } = viewport()

      // Ignore sub-pixel noise. Without this the board can sit in a loop where
      // two measurements differ by a fraction of a pixel and it rescales
      // forever, which reads as flicker on screen.
      if (Math.abs(vw - last.vw) < 2 && Math.abs(vh - last.vh) < 2) {
        stableFor++
        // Once the viewport has held still, stop polling entirely. Real resizes
        // still come through the listeners below.
        if (stableFor >= 3 && settleTimer) {
          clearInterval(settleTimer)
          settleTimer = 0
        }
        return
      }
      stableFor = 0
      last = { vw, vh }

      const sx = vw / 1920
      const sy = vh / 1080
      const distortion = Math.max(sx, sy) / Math.min(sx, sy)
      const s = distortion <= 1.1 ? Math.max(sx, sy) : Math.min(sx, sy)
      const w = 1920 * s
      const h = 1080 * s
      const x = (vw - w) / 2                     // center horizontally (negative = equal crop)
      const y = h > vh ? vh - h : (vh - h) / 2   // crop from the top only; bars split evenly
      setT((prev) =>
        prev.s === s && prev.x === x && prev.y === y ? prev : { s, x, y, vw, vh }
      )
    }

    // Coalesce bursts of events into one measurement per frame.
    const fit = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        apply()
      })
    }

    apply()

    // TV browsers are the reason this is not just a resize listener. Several
    // report a desktop-sized viewport on first paint, settle to the real panel
    // size a moment later, and never fire `resize` — which left the board
    // scaled for 1920 on a smaller viewport, cropping the right and bottom
    // edges off screen.
    //
    // Note there is deliberately NO ResizeObserver on the document here: the
    // transform it triggers can change what the document reports, and the two
    // feed each other into a visible flicker. Events plus a short settling
    // poll that switches itself off are enough.
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    window.addEventListener('load', fit)
    window.visualViewport?.addEventListener('resize', fit)

    settleTimer = setInterval(apply, 500)
    // Hard stop: whatever happens, the poll is gone after 15s.
    const stopPoll = setTimeout(() => {
      if (settleTimer) clearInterval(settleTimer)
      settleTimer = 0
    }, 15000)

    return () => {
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
      window.removeEventListener('load', fit)
      window.visualViewport?.removeEventListener('resize', fit)
      if (raf) cancelAnimationFrame(raf)
      if (settleTimer) clearInterval(settleTimer)
      clearTimeout(stopPoll)
    }
  }, [])
  return t
}

// Latest post of a photo section → one photo object per image.
function photosOf(posts, tag) {
  const post = (posts || [])[0]
  if (!post) return []
  const out = []
  for (const key of ['featured_image', 'image_2', 'image_3']) {
    if (post[key]) out.push({ src: post[key], title: post.title, desc: post.description, tag })
  }
  return out
}

const isDebug = typeof location !== 'undefined' && /[?&]debug=1\b/.test(location.search)

export default function App() {
  const { data, lastUpdated, stale, ready } = useScoreboardData()
  const fit = useFitTransform()

  const slides = useMemo(() => {
    const content = []
    const add = (key, cond, render, duration) => {
      if (cond) content.push({ key, render, duration })
    }

    add('financial', data.grossProfit, () => <FinancialSlide grossProfit={data.grossProfit} jobs={data.jobs} />, 18000)
    // Auto logistics quote, rotated by weekday — not the intranet _slider feed.
    // Always present, so it keeps working even if the intranet is unreachable.
    add('quote', true, () => <QuoteSlide item={resolveQuote()} />)
    add('awardee', data.awardee, () => <AwardeeSlide item={data.awardee} />)
    add('winner', data.weeklyWinner, () => <WinnerSlide item={data.weeklyWinner} />)
    add('project', data.featuredProject, () => <ProjectSlide item={data.featuredProject} />)
    add('flag', data.flag, () => <FlagSlide item={data.flag} />)
    add('term', data.termOfDay, () => <TermSlide item={data.termOfDay} />)
    add('riddle', data.riddle, () => <RiddleSlide item={data.riddle} />)
    add('promises', data.promises, () => <PromisesSlide item={data.promises} />)
    add('status', data.statusLine, () => <StatusSlide item={data.statusLine} />)

    const KB_VARIANTS = ['kb-in', 'kb-right', 'kb-out', 'kb-left']
    const photos = [
      ...photosOf(data.photos1, 'Weekly Challenge'),
      ...photosOf(data.photos2, 'On the Ground'),
      ...photosOf(data.photos3, 'On the Ground'),
    ].map((p, i) => ({
        key: `photo-${p.src}`,
        duration: 9000,
        render: () => <PhotoSlide photo={p} kb={KB_VARIANTS[i % KB_VARIANTS.length]} />,
      }))

    // Interleave: a photo slide after every two content slides.
    const merged = []
    let p = 0
    content.forEach((s, i) => {
      merged.push(s)
      if (i % 2 === 1 && p < photos.length) merged.push(photos[p++])
    })
    merged.push(...photos.slice(p))
    return merged
  }, [data])

  return (
    <>
      {/* Add ?debug=1 to the URL to read the real viewport numbers off the TV.
          Deliberately OUTSIDE the scaled stage and in fixed px, so it stays
          legible even when the scaling is the thing that is broken. */}
      {isDebug && (
        <div className="fit-debug">
          <div>viewport {fit.vw} × {fit.vh}</div>
          <div>innerW/H {window.innerWidth} × {window.innerHeight}</div>
          <div>clientW/H {document.documentElement.clientWidth} × {document.documentElement.clientHeight}</div>
          <div>dpr {window.devicePixelRatio}</div>
          <div>scale {fit.s.toFixed(4)}</div>
          <div>offset {Math.round(fit.x)}, {Math.round(fit.y)}</div>
          <div>screen {window.screen?.width} × {window.screen?.height}</div>
        </div>
      )}
    <div
      className="stage"
      style={{
        position: 'absolute',
        left: fit.x,
        top: fit.y,
        transform: `scale(${fit.s})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Hold the boot screen until the first fetch has settled. Without this
          the slider starts on whatever slide happens to need no data (the
          quote), then reorders under itself as each section arrives — so the
          board appeared to "load on slide 2". */}
      {ready && slides.length ? (
        <Slider slides={slides} />
      ) : (
        <div className="boot">Loading scoreboard…</div>
      )}
      {stale && lastUpdated && (
        <div className="stale-badge">
          last updated{' '}
          {lastUpdated.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
    </>
  )
}
