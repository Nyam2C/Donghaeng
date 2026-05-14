// Phase 4a Day 11 — OpenWeather forecast + 1시간 강수 임계
// GET /api/weather   query: lat, lng
//                    → { raining: bool, tempC: number, alertWindowMin: number }
//
// D2: 응답 shape strict (자유 텍스트 X). D3: server stateless — 클라가 60분 polling.
// D12: 응답 shape freeze — { raining, tempC, alertWindowMin } 만.

import { Hono } from 'hono'

// 응답 시그니처 (D12 freeze)
export interface WeatherResponse {
  raining: boolean
  tempC: number
  alertWindowMin: number
}

const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5/forecast'
const POP_RAIN_THRESHOLD = 0.6
const DEFAULT_ALERT_WINDOW_MIN = 60
const FALLBACK: WeatherResponse = { raining: false, tempC: 20, alertWindowMin: 60 }

interface ForecastEntry {
  dt: number // unix seconds
  main?: { temp?: number }
  rain?: { '3h'?: number }
  pop?: number // probability of precipitation 0..1
}

interface ForecastResponse {
  list?: ForecastEntry[]
}

function getOpenWeatherKey(): string | null {
  const k = process.env.OPENWEATHER_KEY
  return k && k.length > 0 ? k : null
}

function parseForecast(data: ForecastResponse): WeatherResponse {
  const list = Array.isArray(data.list) ? data.list : []
  if (list.length === 0) return FALLBACK

  const first = list[0]
  if (!first) return FALLBACK
  const tempC =
    typeof first.main?.temp === 'number' && Number.isFinite(first.main.temp)
      ? Math.round(first.main.temp * 10) / 10
      : FALLBACK.tempC

  const rain3h = typeof first.rain?.['3h'] === 'number' ? first.rain['3h'] : 0
  const pop = typeof first.pop === 'number' ? first.pop : 0
  const raining = rain3h > 0 || pop >= POP_RAIN_THRESHOLD

  let alertWindowMin = DEFAULT_ALERT_WINDOW_MIN
  if (raining) {
    const nowSec = Math.floor(Date.now() / 1000)
    const diffMin = Math.round((first.dt - nowSec) / 60)
    alertWindowMin = Math.max(0, Math.min(180, diffMin))
  }

  return { raining, tempC, alertWindowMin }
}

const weatherRoutes = new Hono()

// ---------------------------------------------------------------------------
// GET /api/weather?lat=37.5&lng=127.0
// ---------------------------------------------------------------------------
weatherRoutes.get('/', async (c) => {
  const latStr = c.req.query('lat')
  const lngStr = c.req.query('lng')
  const lat = latStr ? Number.parseFloat(latStr) : Number.NaN
  const lng = lngStr ? Number.parseFloat(lngStr) : Number.NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return c.json({ error: 'query "lat","lng" required as numbers' }, 400)
  }

  const key = getOpenWeatherKey()
  if (!key) {
    return c.json({ error: 'OPENWEATHER_KEY not configured' }, 503)
  }

  try {
    const url = `${OPENWEATHER_BASE}?lat=${lat}&lon=${lng}&appid=${key}&units=metric&cnt=2`
    const res = await fetch(url)
    if (!res.ok) {
      // 401 (키 미활성 — 활성화까지 최대 2h) · 429 rate limit · 5xx → silent fallback
      console.warn(`[weather] openweather ${res.status} — fallback`)
      return c.json(FALLBACK)
    }
    const data = (await res.json()) as ForecastResponse
    return c.json(parseForecast(data))
  } catch (err) {
    console.error('[weather] fetch error', err)
    return c.json(FALLBACK)
  }
})

export { weatherRoutes }
