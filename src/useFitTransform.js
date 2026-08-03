import { useEffect, useState } from 'react'

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
export function viewport() {
  const de = document.documentElement
  const vw = Math.min(de?.clientWidth || Infinity, window.innerWidth || Infinity)
  const vh = Math.min(de?.clientHeight || Infinity, window.innerHeight || Infinity)
  return {
    vw: Number.isFinite(vw) && vw > 0 ? vw : 1920,
    vh: Number.isFinite(vh) && vh > 0 ? vh : 1080,
  }
}

export function useFitTransform() {
  const [t, setT] = useState({ s: 1, x: 0, y: 0, vw: 0, vh: 0 })
  useEffect(() => {
    let raf = 0
    let settleTimer = 0
    let stableFor = 0
    let last = { vw: 0, vh: 0 }

    const apply = () => {
      const { vw, vh } = viewport()

      // Ignore sub-pixel noise, and use the run of unchanged measurements to
      // decide when the viewport has settled — see the poll below.
      if (Math.abs(vw - last.vw) < 2 && Math.abs(vh - last.vh) < 2) {
        stableFor++
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
      // vw/vh are compared too, not just s/x/y: two different viewports can
      // produce the same transform (e.g. the 1920×1080 fallback and a real
      // 1920×1080 panel), and without this the ?debug=1 readout would keep
      // reporting the stale pair while claiming the current scale.
      setT((prev) =>
        prev.s === s && prev.x === x && prev.y === y && prev.vw === vw && prev.vh === vh
          ? prev
          : { s, x, y, vw, vh }
      )
    }

    // Coalesce bursts of events into one measurement per frame. Everything goes
    // through this rather than calling apply() directly: viewport() reads
    // clientWidth/clientHeight, which force a layout flush, and inside rAF those
    // reads batch with the browser's own layout pass instead of landing
    // mid-frame during the boot animations.
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

    // Deliberately apply() and NOT fit(): the poll is the safety net for
    // browsers that never fire `resize`, and rAF does not run at all while a
    // page is backgrounded or not yet visible — exactly when a TV is booting.
    // Routing this through rAF made the net silently do nothing. Event-driven
    // measurements still go through fit() to batch their layout reads.
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
