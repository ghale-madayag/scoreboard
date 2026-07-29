import React from 'react'

// Lightweight decorative layer for the light editorial slides —
// confetti top-left, orange blob bottom-right (echoes the original design).
// Pure SVG, no animation.
const CONFETTI = [
  [60, 40, '#e05a4e', -20], [150, 110, '#7cb96a', 15], [240, 60, '#5a8fd6', 40],
  [90, 190, '#f0a04b', 70], [320, 140, '#9b6fd0', -35], [200, 230, '#4ec3b0', 10],
  [400, 90, '#e05a4e', 55], [40, 300, '#5a8fd6', -60], [300, 290, '#f0a04b', 25],
  [420, 210, '#7cb96a', -15], [130, 350, '#9b6fd0', 45], [370, 340, '#4ec3b0', -50],
]

export default function Decorations() {
  return (
    <>
      <svg className="deco deco-confetti" viewBox="0 0 480 400" aria-hidden="true">
        <path d="M0,0 L480,0 C400,120 280,60 220,160 C160,260 60,220 0,340 Z" fill="var(--navy)" opacity="0.9" />
        {CONFETTI.map(([cx, cy, fill, rot], i) =>
          i % 3 === 0 ? (
            <circle key={i} cx={cx} cy={cy} r="7" fill={fill} />
          ) : (
            <rect key={i} x={cx} y={cy} width="13" height="13" rx="2" fill={fill}
              transform={`rotate(${rot} ${cx} ${cy})`} />
          )
        )}
      </svg>
      <svg className="deco deco-blob" viewBox="0 0 500 400" aria-hidden="true">
        <path d="M500,400 L500,120 C380,80 320,200 240,260 C160,320 80,340 0,400 Z" fill="var(--accent-soft)" />
        <path d="M500,400 L500,220 C420,190 350,280 270,330 C210,368 140,380 80,400 Z" fill="var(--accent)" opacity="0.9" />
      </svg>
    </>
  )
}
