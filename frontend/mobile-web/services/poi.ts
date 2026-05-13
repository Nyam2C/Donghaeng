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

export async function nearbyPois(
  _gps: GpsCoord,
  _categories: KakaoCategory[],
): Promise<KakaoPOI[]> {
  throw new Error('NotImplemented · Phase 4 타겟')
}
