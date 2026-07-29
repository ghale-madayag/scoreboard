// Data fetching for every scoreboard section.
// All jet-cct endpoints on the intranet are public GETs with CORS already
// allowing this origin. The Azure gross-profit API has no CORS, so it goes
// through our same-origin PHP proxy (/api/charts.php).

import { sydneyToday } from './logic/quarter.js'

const CCT = 'https://depthintranet.com/wp-json/jet-cct'

// Some CCT text arrives with literal backslash-escaped quotes
// ("company\'s", \\\"can do\\\") — strip the backslashes for display.
function clean(value) {
  if (typeof value === 'string') return value.replace(/\\+(['"])/g, '$1')
  if (Array.isArray(value)) return value.map(clean)
  if (value && typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) out[k] = clean(value[k])
    return out
  }
  return value
}

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return clean(await res.json())
}

const latest = (slug, limit = 1) =>
  getJson(`${CCT}/${slug}?_limit=${limit}&_orderby=cct_created&_order=desc`)

// Daily items are pre-scheduled by date; take the newest with
// schedule_date <= today so a missed day falls back to the latest past item.
async function todays(slug) {
  const today = sydneyToday()
  const items = await getJson(
    `${CCT}/${slug}?_limit=10&_orderby=schedule_date&_order=desc`
  )
  return items.find((i) => i.schedule_date && i.schedule_date <= today) ?? items[0] ?? null
}

export const SECTIONS = {
  grossProfit: () => getJson('api/charts.php'),
  jobs: () => getJson('api/charts.php?data=jobs'),
  quote: () => todays('_slider'),
  awardee: () => latest('core_values_awardee').then((r) => r[0] ?? null),
  weeklyWinner: () => latest('_weekly_idea_sboard').then((r) => r[0] ?? null),
  termOfDay: () => todays('word_of_the_day'),
  flag: () => todays('_guess_the_flag'),
  riddle: () => todays('_brain_challenge'),
  promises: () => latest('promises').then((r) => r[0] ?? null),
  featuredProject: () => latest('_featured_project').then((r) => r[0] ?? null),
  statusLine: () => latest('what_on_you_mind').then((r) => r[0] ?? null),
  photos1: () => latest('weekly_challenge', 5),
  photos2: () => latest('depth_at_work_2', 5),
  photos3: () => latest('depth_at_work_3', 5),
}

// Fetch everything; sections that fail resolve to undefined so the caller
// keeps its previous data for them.
export async function fetchAll() {
  const keys = Object.keys(SECTIONS)
  const results = await Promise.allSettled(keys.map((k) => SECTIONS[k]()))
  const data = {}
  let okCount = 0
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      data[keys[i]] = r.value
      okCount++
    }
  })
  return { data, okCount, total: keys.length }
}
