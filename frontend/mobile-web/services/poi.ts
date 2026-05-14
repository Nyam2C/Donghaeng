import type { GpsCoord, KakaoCategory, KakaoPOI } from '@trip/types'

import { apiFetch } from './api-client'

/**
 * Phase 3 — Kakao 도시/장소 검색 (server `/api/poi/search` 프록시 호출).
 *
 * 시그니처 freeze (D12). body 만 구현.
 *
 * USE_MOCKS=true: api-client 가 __mocks__/api/poi/search.json fixture 반환
 * USE_MOCKS=false: server (Hono) 가 Kakao Local API 중계
 *
 * 빈 query 는 즉시 [] — 불필요한 호출 차단 + autocomplete UX
 */
export async function searchCity(query: string): Promise<KakaoPOI[]> {
  const trimmed = query.trim()
  if (trimmed.length === 0) return []
  const path = `/api/poi/search?q=${encodeURIComponent(trimmed)}`
  return apiFetch<KakaoPOI[]>(path)
}

/**
 * Phase 4 — 좌표 기반 근처 POI 조회 (server `/api/poi/nearby` 프록시 호출).
 *
 * 빈 categories 는 즉시 [] — 불필요한 호출 차단.
 * caller (companion.tsx) 가 1km/5분 캐시 결정. 이 함수는 캐시 없음.
 */
export async function nearbyPois(gps: GpsCoord, categories: KakaoCategory[]): Promise<KakaoPOI[]> {
  if (categories.length === 0) return []
  const path = `/api/poi/nearby?lat=${gps.lat}&lng=${gps.lng}&categories=${categories.join(',')}`
  return apiFetch<KakaoPOI[]>(path)
}
