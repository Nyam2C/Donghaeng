// @trip/types — Kakao POI 도메인 (D2 hallucination 검증 기반)

export type KakaoCategory = 'CE7' | 'FD6' | 'AT4' | 'CT1' | 'AD5'

export interface KakaoPOI {
  id: string
  name: string
  address: string
  category: KakaoCategory
  lat: number
  lng: number
  hours?: { open: string; close: string; closedToday?: boolean }
  phone?: string
}
