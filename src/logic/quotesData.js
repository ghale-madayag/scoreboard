// Quote data + the weekday rotation rule.
//
// Deliberately contains NO image imports, so this module can be loaded by
// plain Node (see scripts/quote-schedule.mjs) as well as by the browser.
// `portrait` is a key into the PORTRAITS map in logisticsQuotes.js.
//
// ─────────────────────────────────────────────────────────────────────────────
// RULES FOR THIS LIST — these exist because an earlier version of this file
// was written from memory and over half the attributions turned out to be
// wrong. Real names and faces go on a company TV; do not guess.
//
//  1. Every entry must have a `source` naming a specific, checkable origin
//     (speech + date, book + year, or a reputable attribution authority).
//     If you cannot produce one, the quote does not go in.
//  2. Beware quote-aggregator sites (Goodreads, BrainyQuote, AZQuotes,
//     QuoteFancy). They repeat misattributions uncritically and are NOT
//     evidence. Quote Investigator, Founders Online, the American Presidency
//     Project, Snopes and Oxford Reference are.
//  3. Every author needs a freely-licensed portrait in src/assets/authors/ —
//     the face on screen must always match the name.
//  4. Array order IS the rotation order. Keep multi-quote authors apart so the
//     same face never lands on two consecutive weekdays.
//
// REMOVED as misattributed or unverifiable (do not re-add without evidence):
//   Churchill "Continuous effort…"        → Liane Cordes, 1981
//   Churchill "However beautiful the strategy…" → unverified (Int'l Churchill Society)
//   Lincoln "Give me six hours…"          → no evidence; surfaced 1983
//   Franklin "By failing to prepare…"     → anonymous proverb, 1919
//   Napoleon "An army marches on its stomach" → not traceable to Napoleon
//   Napoleon "Victory belongs to the most persevering" → no primary source
//   Ford "Coming together is a beginning…" → Edward Everett Hale
//   Ford "Whether you think you can…"      → no primary source; 1947 attribution
//   Ford "Quality means doing it right…"   → no primary source
//   Carnegie "Teamwork is the ability…"    → no primary source
//   Bradley "Congress can make a general…" → no documented source
//   T. Roosevelt "Do what you can…"        → TR credited Squire Bill Widener
// ─────────────────────────────────────────────────────────────────────────────

import { weekdaySeed, pickForWeekday } from './weekday.js'

export { weekdaySeed, pickForWeekday }

// Franklin's maxims are quoted verbatim from "The Way to Wealth" (1758), which
// collects his own Poor Richard's Almanack proverbs. Only the era's decorative
// mid-sentence Capitalisation has been normalised — no words changed.
export const QUOTES = [
  {
    text: 'Lost time is never found again.',
    author: 'Benjamin Franklin',
    portrait: 'franklin',
    source: "Poor Richard Improved, 1748; collected in The Way to Wealth, 1758",
  },
  {
    text: 'Amateurs talk about strategy and tactics. Professionals talk about logistics and sustainability in warfare.',
    author: 'Gen. Robert H. Barrow',
    portrait: 'barrow',
    source: 'San Diego Union Tribune interview, 11 Nov 1979 (as 27th Commandant of the Marine Corps)',
  },
  {
    text: 'Drive thy business, let not that drive thee.',
    author: 'Benjamin Franklin',
    portrait: 'franklin',
    source: "Poor Richard's Almanack; collected in The Way to Wealth, 1758",
  },
  {
    text: 'Genius is one percent inspiration, ninety-nine percent perspiration.',
    author: 'Thomas Edison',
    portrait: 'edison',
    source: "Reported by M. A. Rosanoff, Harper's Monthly Magazine, Sept 1932; earlier variants 1898–1901",
  },
  {
    text: 'A little neglect may breed great mischief.',
    author: 'Benjamin Franklin',
    portrait: 'franklin',
    source: "Poor Richard's Almanack; collected in The Way to Wealth, 1758",
  },
  {
    text: 'Far and away the best prize that life offers is the chance to work hard at work worth doing.',
    author: 'Theodore Roosevelt',
    portrait: 'roosevelt',
    source: '"The Square Deal", Labor Day speech, Syracuse NY, 7 Sept 1903 (American Presidency Project)',
  },
  {
    text: 'Beware of little expenses; a small leak will sink a great ship.',
    author: 'Benjamin Franklin',
    portrait: 'franklin',
    source: "Poor Richard's Almanack; collected in The Way to Wealth, 1758",
  },
  {
    text: 'Plans are worthless, but planning is everything.',
    author: 'Dwight D. Eisenhower',
    portrait: 'eisenhower',
    source: 'Remarks at the National Defense Executive Reserve Conference, 14 Nov 1957 (Eisenhower Library)',
  },
  {
    text: 'There are no gains without pains.',
    author: 'Benjamin Franklin',
    portrait: 'franklin',
    source: "Poor Richard's Almanack; collected in The Way to Wealth, 1758",
  },
  {
    text: 'Logistics comprises the means and arrangements which work out the plans of strategy and tactics.',
    author: 'Antoine-Henri Jomini',
    portrait: 'jomini',
    source: 'The Art of War (Summary of the Art of War, 1838), ch. VI, art. XLI',
  },
  {
    text: 'Diligence is the mother of good luck.',
    author: 'Benjamin Franklin',
    portrait: 'franklin',
    source: "Poor Richard's Almanack; collected in The Way to Wealth, 1758",
  },
  {
    text: 'Our greatest weakness lies in giving up. The most certain way to succeed is always to try just one more time.',
    author: 'Thomas Edison',
    portrait: 'edison',
    source: 'Confirmed by the Thomas Edison Center at Menlo Park (Snopes fact-check); original context not located',
  },
  {
    text: 'One to-day is worth two to-morrows.',
    author: 'Benjamin Franklin',
    portrait: 'franklin',
    source: "Poor Richard's Almanack; collected in The Way to Wealth, 1758",
  },
  {
    text: 'As soon as a man ceases to improve, he goes backward.',
    author: 'Theodore Roosevelt',
    portrait: 'roosevelt',
    source: 'Letter to his son Archie (Theodore Roosevelt Center)',
  },
  {
    text: 'Little strokes fell great oaks.',
    author: 'Benjamin Franklin',
    portrait: 'franklin',
    source: "Poor Richard's Almanack; collected in The Way to Wealth, 1758",
  },
  {
    text: 'A good plan violently executed now is better than a perfect plan executed next week.',
    author: 'Gen. George S. Patton',
    portrait: 'patton',
    source: 'Letter to his son, 6 June 1944 (Oxford Reference; cited in Sobel, The Fighting Pattons)',
  },
  {
    text: 'Sloth makes all things difficult, but industry all easy.',
    author: 'Benjamin Franklin',
    portrait: 'franklin',
    source: "Poor Richard's Almanack; collected in The Way to Wealth, 1758",
  },
  {
    text: 'The history of failure in war can almost be summed up in two words: too late.',
    author: 'Gen. Douglas MacArthur',
    portrait: 'macarthur',
    source: 'Statement of 1940, quoted in James B. Reston, Prelude to Victory (1942), p. 64',
  },
  {
    text: 'A policy of words unbacked by deeds is considerably worse than useless.',
    author: 'Theodore Roosevelt',
    portrait: 'roosevelt',
    source: 'Letter to Professor J. W. Jenke, Cornell University (Theodore Roosevelt Center)',
  },
  {
    text: 'By leadership we mean the art of getting someone else to do something that you want done because he wants to do it.',
    author: 'Dwight D. Eisenhower',
    portrait: 'eisenhower',
    source: 'Remarks at the Society for Personnel Administration, 12 May 1954 (Eisenhower Library)',
  },
  {
    text: 'It does not make any difference what work the man is doing if he does it well.',
    author: 'Theodore Roosevelt',
    portrait: 'roosevelt',
    source: 'Speech on the fundamental virtues of citizenship (Theodore Roosevelt Center)',
  },
]

/**
 * The quote for a given date — no images attached. Deterministic, which is why
 * no weekend "generate next week" job is needed: every future weekday's quote
 * is already decided by this function and can be printed months ahead.
 */
export function quoteDataFor(date = new Date()) {
  return pickForWeekday(QUOTES, date)
}
