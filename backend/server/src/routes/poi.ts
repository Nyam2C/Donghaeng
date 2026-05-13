// Phase 3 Day 7 — Kakao Local API proxy
// GET /api/poi/search   query: q
//                       → KakaoPOI[]
// GET /api/poi/nearby   query: lat, lng, categories
//                       → KakaoPOI[]
//
// D12: zod 미설치 → 수동 validate. 새 dependency 추가 X.

import type { KakaoCategory, KakaoPOI } from '@trip/types'
import { Hono } from 'hono'

// Phase 3 Day 7 응답 시그니처
export type POIResponse = KakaoPOI[]

const KAKAO_BASE = 'https://dapi.kakao.com/v2/local/search'
const ALLOWED_CATEGORIES: KakaoCategory[] = ['CE7', 'FD6', 'AT4', 'CT1', 'AD5']

interface KakaoDocument {
  id: string
  place_name: string
  road_address_name?: string
  address_name?: string
  category_group_code?: string
  x: string // longitude
  y: string // latitude
  phone?: string
}

interface KakaoKeywordResponse {
  documents: KakaoDocument[]
  meta?: { total_count: number; pageable_count: number; is_end: boolean }
}

function getKakaoKey(): string | null {
  const k = process.env.KAKAO_REST_KEY
  return k && k.length > 0 ? k : null
}

function mapDocument(doc: KakaoDocument): KakaoPOI | null {
  const code = doc.category_group_code
  // D2: 허용 카테고리 밖이면 'CE7' 로 fallback (카페 기본 — friend tone)
  const category: KakaoCategory =
    code && (ALLOWED_CATEGORIES as string[]).includes(code) ? (code as KakaoCategory) : 'CE7'
  const lat = Number.parseFloat(doc.y)
  const lng = Number.parseFloat(doc.x)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const address = doc.road_address_name || doc.address_name || ''
  return {
    id: doc.id,
    name: doc.place_name,
    address,
    category,
    lat,
    lng,
    phone: doc.phone && doc.phone.length > 0 ? doc.phone : undefined,
  }
}

async function kakaoFetch(url: string, key: string): Promise<KakaoKeywordResponse> {
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
  })
  if (!res.ok) {
    // 429 rate limit / 401 키 문제 등 — 빈 documents 로 graceful
    if (res.status === 429 || res.status === 401) {
      return { documents: [] }
    }
    throw new Error(`Kakao API ${res.status}`)
  }
  return (await res.json()) as KakaoKeywordResponse
}

const poiRoutes = new Hono()

// ---------------------------------------------------------------------------
// GET /api/poi/search?q=강남역
// ---------------------------------------------------------------------------
poiRoutes.get('/search', async (c) => {
  const q = c.req.query('q')?.trim()
  if (!q || q.length === 0) {
    return c.json({ error: 'query "q" required' }, 400)
  }
  const key = getKakaoKey()
  if (!key) {
    return c.json({ error: 'KAKAO_REST_KEY not configured' }, 503)
  }

  try {
    const url = `${KAKAO_BASE}/keyword.json?query=${encodeURIComponent(q)}&size=15`
    const data = await kakaoFetch(url, key)
    const pois: KakaoPOI[] = data.documents
      .map(mapDocument)
      .filter((p): p is KakaoPOI => p !== null)
    return c.json(pois)
  } catch (err) {
    console.error('[poi/search] kakao error', err)
    // rate-limit graceful — friend tone fallback (빈 list, 200)
    return c.json([] as KakaoPOI[])
  }
})

// ---------------------------------------------------------------------------
// GET /api/poi/nearby?lat=37.5&lng=127.0&categories=CE7,FD6
// ---------------------------------------------------------------------------
poiRoutes.get('/nearby', async (c) => {
  const latStr = c.req.query('lat')
  const lngStr = c.req.query('lng')
  const categoriesStr = c.req.query('categories') ?? ALLOWED_CATEGORIES.join(',')
  const lat = latStr ? Number.parseFloat(latStr) : Number.NaN
  const lng = lngStr ? Number.parseFloat(lngStr) : Number.NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return c.json({ error: 'query "lat","lng" required as numbers' }, 400)
  }
  const categories = categoriesStr
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((c): c is KakaoCategory => (ALLOWED_CATEGORIES as string[]).includes(c))
  if (categories.length === 0) {
    return c.json({ error: 'no valid categories (CE7/FD6/AT4/CT1/AD5)' }, 400)
  }
  const key = getKakaoKey()
  if (!key) {
    return c.json({ error: 'KAKAO_REST_KEY not configured' }, 503)
  }

  try {
    const results = await Promise.all(
      categories.map(async (code) => {
        const url = `${KAKAO_BASE}/category.json?category_group_code=${code}&x=${lng}&y=${lat}&radius=500&sort=distance`
        return kakaoFetch(url, key)
      }),
    )
    const merged = new Map<string, KakaoPOI>()
    for (const r of results) {
      for (const doc of r.documents) {
        const poi = mapDocument(doc)
        if (poi && !merged.has(poi.id)) merged.set(poi.id, poi)
      }
    }
    return c.json(Array.from(merged.values()))
  } catch (err) {
    console.error('[poi/nearby] kakao error', err)
    return c.json([] as KakaoPOI[])
  }
})

export { poiRoutes }
