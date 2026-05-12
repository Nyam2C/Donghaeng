import type { GpsCoord, KakaoCategory, KakaoPOI } from '@trip/types'

export async function searchCity(_query: string): Promise<KakaoPOI[]> {
  throw new Error('NotImplemented · Phase 3 타겟')
}

export async function nearbyPois(
  _gps: GpsCoord,
  _categories: KakaoCategory[],
): Promise<KakaoPOI[]> {
  throw new Error('NotImplemented · Phase 4 타겟')
}
