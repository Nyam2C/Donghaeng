// Phase 4a Day 11 — OpenWeather forecast + 1시간 강수 임계
// GET /api/weather             query: lat, lng
//                              → { raining: bool, tempC: number, alertWindowMin: number }
// Phase 4e Day 22 (D33) — 일자별 forecast
// GET /api/weather/forecast    query: city, startDate, endDate
//                              → { city, days: [{date, tempC, condition, rainProb}] }
//
// D2: 응답 shape strict (자유 텍스트 X). D3: server stateless — 클라가 60분 polling.
// D12: 응답 shape freeze — { raining, tempC, alertWindowMin } 만 + 신규 ForecastResponse 만.

import type { DayForecast, ForecastResponse, WeatherCondition } from '@trip/types'
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

interface OpenWeatherForecastBody {
  list?: ForecastEntry[]
}

function getOpenWeatherKey(): string | null {
  const k = process.env.OPENWEATHER_KEY
  return k && k.length > 0 ? k : null
}

function parseForecast(data: OpenWeatherForecastBody): WeatherResponse {
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
    const data = (await res.json()) as OpenWeatherForecastBody
    return c.json(parseForecast(data))
  } catch (err) {
    console.error('[weather] fetch error', err)
    return c.json(FALLBACK)
  }
})

// ---------------------------------------------------------------------------
// Phase 4e Day 22 (D33) — GET /api/weather/forecast
// query: city, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)  → ForecastResponse
//
// 흐름:
//   1. query parse + validate (한국 도시 whitelist · 날짜 ISO · 최대 5일)
//   2. Kakao 검색 → city → lat/lng (KEY 없으면 whitelist 매핑 fallback)
//   3. OpenWeather Forecast 5-day → 일자별 그룹화 (각 day 정오 기준)
//   4. KEY/네트워크 fail 시 mock fallback (강릉 톤 3 day)
// ---------------------------------------------------------------------------

// 한국 도시 → lat/lng fallback (Kakao KEY 없거나 fetch 실패 시)
const CITY_COORD_FALLBACK: Record<string, { lat: number; lng: number }> = {
  강릉: { lat: 37.7917, lng: 128.9015 },
  부산: { lat: 35.1796, lng: 129.0756 },
  제주: { lat: 33.4996, lng: 126.5312 },
  통영: { lat: 34.8544, lng: 128.4332 },
  속초: { lat: 38.207, lng: 128.5918 },
  여수: { lat: 34.7604, lng: 127.6622 },
  경주: { lat: 35.8562, lng: 129.2247 },
  전주: { lat: 35.8242, lng: 127.148 },
}

interface KakaoKeywordDoc {
  y: string // lat
  x: string // lng
}
interface KakaoKeywordBody {
  documents: KakaoKeywordDoc[]
}

function getKakaoKey(): string | null {
  const k = process.env.KAKAO_REST_KEY
  return k && k.length > 0 ? k : null
}

async function fetchCityCoord(city: string): Promise<{ lat: number; lng: number } | null> {
  const kakaoKey = getKakaoKey()
  if (kakaoKey) {
    try {
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(city)}&size=1`
      const res = await fetch(url, { headers: { Authorization: `KakaoAK ${kakaoKey}` } })
      if (res.ok) {
        const data = (await res.json()) as KakaoKeywordBody
        const first = data.documents?.[0]
        if (first) {
          const lat = Number.parseFloat(first.y)
          const lng = Number.parseFloat(first.x)
          if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
        }
      } else {
        console.warn(`[weather/forecast] kakao keyword ${res.status} — falling back`)
      }
    } catch (err) {
      console.warn('[weather/forecast] kakao fetch error', err)
    }
  }
  // whitelist fallback (도시 키워드 토큰 중 첫 매칭)
  if (CITY_COORD_FALLBACK[city]) return CITY_COORD_FALLBACK[city]
  const tokens = city.split(/[\s,·]+/).filter((t) => t.length > 0)
  for (const t of tokens) {
    if (CITY_COORD_FALLBACK[t]) return CITY_COORD_FALLBACK[t]
  }
  return null
}

// OpenWeather Forecast 5-day entry (3시간 간격)
interface OWForecastListEntry {
  dt: number
  dt_txt?: string
  main?: { temp?: number }
  weather?: Array<{ main?: string }>
  pop?: number
}
interface OWForecastBody {
  list?: OWForecastListEntry[]
}

// OpenWeather weather.main → 우리 condition 매핑
function mapCondition(main: string | undefined): WeatherCondition {
  if (!main) return 'cloudy'
  if (main === 'Clear') return 'sunny'
  if (main === 'Rain' || main === 'Drizzle' || main === 'Thunderstorm') return 'rainy'
  if (main === 'Snow') return 'snowy'
  return 'cloudy'
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parseISODate(s: string): Date | null {
  if (!ISO_DATE_RE.test(s)) return null
  const d = new Date(`${s}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function enumerateDates(startStr: string, endStr: string): string[] {
  const start = parseISODate(startStr)
  const end = parseISODate(endStr)
  if (!start || !end) return []
  if (end.getTime() < start.getTime()) return []
  const dates: string[] = []
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    dates.push(isoDate(new Date(t)))
    if (dates.length > 5) break // 최대 5일 cap
  }
  return dates
}

/**
 * OpenWeather 3시간 forecast list → 일자별 그룹화.
 * 각 day 의 entry 중 12:00 UTC 와 가장 가까운 (또는 첫 entry) 를 대표로 선택.
 */
function groupByDay(list: OWForecastListEntry[], dates: string[]): DayForecast[] {
  const byDate: Record<string, OWForecastListEntry[]> = {}
  for (const entry of list) {
    const d = new Date(entry.dt * 1000)
    const key = isoDate(d)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(entry)
  }
  const out: DayForecast[] = []
  for (const date of dates) {
    const entries = byDate[date]
    if (!entries || entries.length === 0) continue
    // 정오 (UTC 12:00) 와 가장 가까운 entry 우선
    let pick = entries[0]
    if (!pick) continue
    let bestDelta = Number.POSITIVE_INFINITY
    for (const e of entries) {
      const hourUtc = new Date(e.dt * 1000).getUTCHours()
      const delta = Math.abs(hourUtc - 12)
      if (delta < bestDelta) {
        bestDelta = delta
        pick = e
      }
    }
    const tempRaw = pick.main?.temp
    const tempC = typeof tempRaw === 'number' && Number.isFinite(tempRaw) ? Math.round(tempRaw) : 18
    const condition = mapCondition(pick.weather?.[0]?.main)
    const pop = typeof pick.pop === 'number' ? pick.pop : 0
    const rainProb = Math.max(0, Math.min(100, Math.round(pop * 100)))
    out.push({ date, tempC, condition, rainProb })
  }
  return out
}

// Mock fallback — KEY 없거나 모든 fetch 실패 시. design-preview SCENARIO 02.5 톤.
function mockForecast(city: string, dates: string[]): ForecastResponse {
  const palette: Array<{ tempC: number; condition: WeatherCondition; rainProb: number }> = [
    { tempC: 17, condition: 'cloudy', rainProb: 0 },
    { tempC: 14, condition: 'rainy', rainProb: 80 },
    { tempC: 19, condition: 'sunny', rainProb: 0 },
    { tempC: 18, condition: 'cloudy', rainProb: 20 },
    { tempC: 20, condition: 'sunny', rainProb: 0 },
  ]
  const days: DayForecast[] = dates.map((date, i) => {
    const p = palette[i % palette.length] ?? palette[0]
    if (!p) return { date, tempC: 18, condition: 'cloudy', rainProb: 0 }
    return { date, tempC: p.tempC, condition: p.condition, rainProb: p.rainProb }
  })
  return { city, days }
}

const OPENWEATHER_FORECAST_BASE = 'https://api.openweathermap.org/data/2.5/forecast'

weatherRoutes.get('/forecast', async (c) => {
  const city = (c.req.query('city') ?? '').trim()
  const startDate = (c.req.query('startDate') ?? '').trim()
  const endDate = (c.req.query('endDate') ?? '').trim()

  if (city.length === 0) {
    return c.json({ error: 'query "city" required' }, 400)
  }
  if (!ISO_DATE_RE.test(startDate) || !ISO_DATE_RE.test(endDate)) {
    return c.json({ error: 'query "startDate","endDate" must be YYYY-MM-DD' }, 400)
  }
  const dates = enumerateDates(startDate, endDate)
  if (dates.length === 0) {
    return c.json({ error: 'invalid date range (startDate must be ≤ endDate)' }, 400)
  }

  const owKey = getOpenWeatherKey()
  const coord = await fetchCityCoord(city)
  if (!owKey || !coord) {
    // KEY 미설정 또는 coord 못 구한 경우 → mock fallback (서비스 무중단)
    return c.json(mockForecast(city, dates))
  }

  try {
    const url = `${OPENWEATHER_FORECAST_BASE}?lat=${coord.lat}&lon=${coord.lng}&appid=${owKey}&units=metric&lang=kr`
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[weather/forecast] openweather ${res.status} — mock fallback`)
      return c.json(mockForecast(city, dates))
    }
    const data = (await res.json()) as OWForecastBody
    const list = Array.isArray(data.list) ? data.list : []
    const days = groupByDay(list, dates)
    // 응답 list 가 비어있거나 한 day 도 매칭 안 되면 mock
    if (days.length === 0) {
      return c.json(mockForecast(city, dates))
    }
    // 일부 day 만 매칭됐다면 mock 으로 채움 (5-day API 는 ~5 일 커버하지만 boundary 케이스 보호)
    if (days.length < dates.length) {
      const mock = mockForecast(city, dates).days
      const map = new Map(days.map((d) => [d.date, d]))
      const merged = dates
        .map((date) => map.get(date) ?? mock.find((m) => m.date === date))
        .filter((d): d is DayForecast => d !== undefined)
      return c.json({ city, days: merged } satisfies ForecastResponse)
    }
    return c.json({ city, days } satisfies ForecastResponse)
  } catch (err) {
    console.error('[weather/forecast] fetch error', err)
    return c.json(mockForecast(city, dates))
  }
})

export { weatherRoutes }
