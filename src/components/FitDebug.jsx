import React from 'react'

// ?debug=1 readout for diagnosing how a TV browser reports its viewport.
//
// Exists because TV browsers disagree with each other about innerWidth vs
// clientWidth vs screen, and the board's scaling depends on which is right.
// Rendered OUTSIDE the scaled stage and sized in fixed px, so it stays legible
// even when the scaling is the thing that is broken.
//
// `fit` is the object from useFitTransform — showing what the scaler actually
// measured, alongside the raw platform values, is the whole point: a
// disagreement between the two rows IS the diagnosis.
export default function FitDebug({ fit }) {
  return (
    <div className="fit-debug">
      <div>viewport {fit.vw} × {fit.vh}</div>
      <div>innerW/H {window.innerWidth} × {window.innerHeight}</div>
      <div>clientW/H {document.documentElement.clientWidth} × {document.documentElement.clientHeight}</div>
      <div>dpr {window.devicePixelRatio}</div>
      <div>scale {fit.s.toFixed(4)}</div>
      <div>offset {Math.round(fit.x)}, {Math.round(fit.y)}</div>
      <div>screen {window.screen?.width} × {window.screen?.height}</div>
    </div>
  )
}
