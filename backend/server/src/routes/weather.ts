// Phase 4a Day 11 — OpenWeather forecast + 1시간 강수 임계
// GET /api/weather   query: lat, lng
//                    → { raining: bool, tempC: number, alertWindowMin: number }

import { Hono } from 'hono'

const weatherRoutes = new Hono()

weatherRoutes.get('/', (c) => {
  return c.json(
    { stub: true, target: 'Phase 4a Day 11 — OpenWeather forecast + 1시간 강수 임계' },
    501,
  )
})

export { weatherRoutes }
