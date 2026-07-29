import { useEffect, useState } from 'react'

// Animate a number from 0 to `target` on mount (ease-out cubic).
export function useCountUp(target, duration = 1400, delay = 300) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (target == null) return
    let raf
    let start
    const tick = (t) => {
      if (start === undefined) start = t
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [target, duration, delay])

  return target == null ? null : value
}
