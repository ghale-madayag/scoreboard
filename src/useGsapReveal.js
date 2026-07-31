import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

// Splits a plain-text element into per-word or per-char spans.
// Elements with child markup can't be split safely — returns null and the
// caller falls back to animating the whole block.
function splitEl(el, mode) {
  if (el.children.length > 0) return null
  const text = el.textContent
  if (!text.trim()) return null
  const parts = mode === 'words' ? text.split(/(\s+)/) : [...text]
  const frag = document.createDocumentFragment()
  const spans = []
  for (const part of parts) {
    if (!part) continue
    if (/^\s+$/.test(part)) {
      frag.appendChild(document.createTextNode(part))
      continue
    }
    const s = document.createElement('span')
    s.textContent = part
    s.style.display = 'inline-block'
    s.style.whiteSpace = 'pre'
    spans.push(s)
    frag.appendChild(s)
  }
  el.textContent = ''
  el.appendChild(frag)
  return spans
}

// GSAP entrance animation for every element tagged data-gsap inside the
// slide. Modes: "chars" | "words" (stagger split text) | "rise" (block).
// Optional data-gsap-delay="0.3" offsets each element's start.
export function useGsapReveal() {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    // The outgoing slide remounts into the "leaving" slot during a
    // transition — don't replay its text animation mid-exit.
    if (root.closest('.slider-slide.leaving')) return

    const ctx = gsap.context(() => {
      root.querySelectorAll('[data-gsap]').forEach((el) => {
        const mode = el.dataset.gsap
        const delay = parseFloat(el.dataset.gsapDelay || '0')
        if (mode === 'chars' || mode === 'words') {
          const spans = splitEl(el, mode)
          if (spans && spans.length) {
            gsap.from(spans, {
              opacity: 0,
              y: mode === 'chars' ? 26 : 20,
              duration: mode === 'chars' ? 0.6 : 0.55,
              ease: 'power3.out',
              stagger: mode === 'chars' ? 0.035 : 0.05,
              delay,
              // Drop the inline transform/opacity once the reveal is done.
              // Without this every split span keeps a transform and stays its
              // own composited layer for the life of the slide — dozens of
              // them on a big heading, which a TV's GPU renders with visible
              // shimmer. Cleared, the text collapses back to a single layer.
              clearProps: 'all',
            })
            return
          }
        }
        gsap.from(el, {
          opacity: 0,
          y: 22,
          duration: 0.7,
          ease: 'power3.out',
          delay,
          clearProps: 'all',
        })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return ref
}
