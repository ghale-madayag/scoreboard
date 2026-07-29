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
function useFitTransform() {
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const sx = vw / 1920
      const sy = vh / 1080
      const distortion = Math.max(sx, sy) / Math.min(sx, sy)
      const s = distortion <= 1.1 ? Math.max(sx, sy) : Math.min(sx, sy)
      const w = 1920 * s
      const h = 1080 * s
      const x = (vw - w) / 2                     // center horizontally (negative = equal crop)
      const y = h > vh ? vh - h : (vh - h) / 2   // crop from the top only; bars split evenly
      setT({ s, x, y })
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
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

export default function App() {
  const { data, lastUpdated, stale } = useScoreboardData()
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
      {slides.length ? (
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
  )
}
