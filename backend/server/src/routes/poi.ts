// Phase 3 Day 7 — Kakao Local API proxy
// GET /api/poi/search   query: q
//                       → KakaoPOI[]
// GET /api/poi/nearby   query: lat, lng, categories
//                       → KakaoPOI[]

import type { KakaoPOI } from '@trip/types'
import { Hono } from 'hono'

// Phase 3 Day 7 응답 시그니처
export type POIResponse = KakaoPOI[]

const poiRoutes = new Hono()

poiRoutes.get('/search', (c) => {
  return c.json({ stub: true, target: 'Phase 3 Day 7 — Kakao Local API proxy' }, 501)
})

poiRoutes.get('/nearby', (c) => {
  return c.json({ stub: true, target: 'Phase 3 Day 7 — Kakao Local API proxy' }, 501)
})

export { poiRoutes }
