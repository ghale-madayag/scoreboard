import React, { useEffect, useMemo } from 'react'
import { useScoreboardData } from './useScoreboardData.js'
import { stripSubjectNoise } from './api.js'
import { useFitTransform } from './useFitTransform.js'
import { resolveQuote } from './logic/logisticsQuotes.js'
import { collectImageUrls, preloadImages } from './preloadImages.js'
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
import FitDebug from './components/FitDebug.jsx'

// Latest post of a photo section → one photo object per image.
function photosOf(posts, tag) {
  const post = (posts || [])[0]
  if (!post) return []
  const out = []
  for (const key of ['featured_image', 'image_2', 'image_3']) {
    if (post[key]) {
      out.push({
        src: post[key],
        // Captions come from an email subject line — see stripSubjectNoise.
        title: stripSubjectNoise(post.title),
        desc: post.description,
        tag,
      })
    }
  }
  return out
}

const isDebug = typeof location !== 'undefined' && /[?&]debug=1\b/.test(location.search)

export default function App() {
  const { data, lastUpdated, stale, ready } = useScoreboardData()
  const fit = useFitTransform()

  // Warm the image cache for every slide while the first one is on screen.
  // Today's quote portrait is a bundled asset, not in `data`, so it is added
  // explicitly — everything remote comes out of the data walk.
  useEffect(() => {
    preloadImages([resolveQuote().authorImage, ...collectImageUrls(data)])
  }, [data])

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
      {/* Outside the scaled stage on purpose — it has to stay readable when
          the scaling itself is what's wrong. */}
      {isDebug && <FitDebug fit={fit} />}
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
