// Auto-rotating quote for the "Focus of the Week" slide.
//
// One quote per WEEKDAY, changing at midnight Australia/Sydney; weekends hold
// Friday's. Selection is purely a function of the date — no API, no key, no
// cost, no scheduled job, and the same quote shows on every screen all day.
//
// This module's only job is to attach the author portraits. The quote list and
// the rotation rule live in quotesData.js, which has no image imports so it can
// be loaded by Node (see `npm run quotes`).

import { QUOTES, quoteDataFor, weekdaySeed, pickForWeekday } from './quotesData.js'

// All portraits are PUBLIC DOMAIN or CC0 on Wikimedia Commons (each licence was
// checked against the Commons metadata), so they can be shown on an internal
// display with no credit line and no licensing exposure.
// Only the authors whose quotes survived verification are imported. Portraits
// for Churchill, Ford, Lincoln, Napoleon, Carnegie and Bradley remain on disk
// in src/assets/authors/ — if a properly-sourced quote from one of them is
// found later, just import it here and add the quote to quotesData.js.
import barrow from '../assets/authors/barrow.jpg'
import eisenhower from '../assets/authors/eisenhower.jpg'
import jomini from '../assets/authors/jomini.jpg'
import patton from '../assets/authors/patton.jpg'
import macarthur from '../assets/authors/macarthur.jpg'
import franklin from '../assets/authors/franklin.jpg'
import roosevelt from '../assets/authors/roosevelt.jpg'
import edison from '../assets/authors/edison.jpg'

const PORTRAITS = { barrow, eisenhower, jomini, patton, macarthur, franklin, roosevelt, edison }

// Fail loudly in dev if a quote is added without its portrait — that would put
// a face on screen that doesn't match the name, or no face at all.
const missing = QUOTES.filter((q) => !PORTRAITS[q.portrait])
if (missing.length && import.meta.env?.DEV) {
  console.error(
    '[quotes] missing portrait for:',
    missing.map((q) => `${q.author} (${q.portrait})`).join(', ')
  )
}

export const LOGISTICS_QUOTES = QUOTES.map((q) => ({ ...q, image: PORTRAITS[q.portrait] }))

export { weekdaySeed, pickForWeekday }

/** The quote for a given day, with its author portrait attached. */
export function autoQuoteFor(date = new Date()) {
  const q = quoteDataFor(date)
  return q ? { ...q, image: PORTRAITS[q.portrait] } : null
}

/**
 * What the quote slide shows: the day's quote and the portrait of the person
 * who said it.
 *
 * The intranet `_slider` feed is deliberately NOT consulted — its quotes are
 * general motivational ones, and the board is meant to stay logistics-focused.
 * A side benefit is that this slide keeps working when the intranet is down.
 *
 * To go back to the intranet feed, render <QuoteSlide item={data.quote} /> in
 * App.jsx instead of calling this.
 */
export function resolveQuote(_unused = null, date = new Date()) {
  const auto = autoQuoteFor(date)
  return {
    quotes: auto.text,
    author: auto.author,
    authorImage: auto.image,
    background_image: null,
    isAuto: true,
  }
}
