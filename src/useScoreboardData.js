import { useEffect, useRef, useState } from 'react'
import { fetchAll } from './api.js'
import { sydneyToday, sydneyHour } from './logic/quarter.js'

const POLL_MS = 4 * 60 * 1000
const JITTER_MS = 30 * 1000

// After a failed first load, retry quickly instead of waiting out a full poll
// interval — otherwise the board sits on a near-empty slide list for 4 minutes.
const FIRST_RETRY_MS = 8 * 1000

export function useScoreboardData() {
  const [data, setData] = useState({})
  const [lastUpdated, setLastUpdated] = useState(null)
  const [stale, setStale] = useState(false)
  // False until the first fetch has settled, so the caller can hold the slider
  // back rather than building it from a half-empty data set.
  const [ready, setReady] = useState(false)
  const failures = useRef(0)
  const readyRef = useRef(false)
  const day = useRef(sydneyToday())
  const reloadedToday = useRef(false)

  useEffect(() => {
    let timer
    let cancelled = false

    async function poll() {
      try {
        const { data: fresh, okCount } = await fetchAll()
        if (cancelled) return
        if (okCount > 0) {
          setData((prev) => ({ ...prev, ...fresh }))
          setLastUpdated(new Date())
          failures.current = 0
          setStale(false)
        } else {
          failures.current++
        }
      } catch {
        failures.current++
      }
      if (failures.current >= 3) setStale(true)
      const wasFirst = !readyRef.current
      readyRef.current = true
      setReady(true)
      schedule(wasFirst && failures.current > 0)
    }

    function schedule(retrySoon = false) {
      if (cancelled) return
      const delay = retrySoon
        ? FIRST_RETRY_MS
        : POLL_MS + (Math.random() * 2 - 1) * JITTER_MS
      timer = setTimeout(poll, delay)
    }

    // Once a minute: midnight rollover refetch + 3 a.m. maintenance reload.
    const minute = setInterval(() => {
      const today = sydneyToday()
      if (today !== day.current) {
        day.current = today
        reloadedToday.current = false
        clearTimeout(timer)
        poll()
      }
      const h = new Date().getHours() // TV-local time for the reload window
      if (h === 3 && !reloadedToday.current) {
        reloadedToday.current = true
        window.location.reload()
      }
    }, 60 * 1000)

    poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
      clearInterval(minute)
    }
  }, [])

  return { data, lastUpdated, stale, ready }
}
