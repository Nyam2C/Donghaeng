// @trip/types — LLM 추천 응답 (D2 JSON schema 강제)

export interface LLMRecommendation {
  recommended_ids: string[]
  note: string
}

// D21 — 도시 추천 (SCENARIO 02, 짜는 단계의 1순위 도시 4개)
// 친구 톤 voice 인용 "비슷한 결, 다른 결로 섞었어요" 약속을 지키기 위한
// AI 가 사용자 결 기반으로 도시를 골라주는 응답 타입.
export interface CityCandidate {
  name: string // 한국 도시명 (광역시도 또는 시군구)
  reason: string // 친구 톤 짧은 이유 (10-25자 권장)
  match: number // 0-100 매칭 점수
}

export interface LLMCityRecommendation {
  cities: CityCandidate[] // 정확히 4개
  note: string // 친구 톤 멘트 (옵션 — SCENARIO 02 의 voice 인용 보완)
}

// D29 — SCENARIO 03 POI 큐레이션 (도시 결정 후 좋아요 모으는 단계)
// 친구 톤 voice "이 안에서 가볼 만한 곳들이에요" 약속을 지키기 위한
// AI 가 도시 + 사용자 결 + 싫어요 history 기반으로 POI 를 큐레이션해주는 응답.
export interface TripPoiCandidate {
  id: string // POI 식별자 (kakao_* 또는 LLM 부여 slug)
  name: string // POI 이름
  category: string // "카페 · 오션뷰" 같은 짧은 카테고리 라벨
  reason: string // 친구 톤 짧은 이유 (10-25자 권장)
  match: number // 0-100 매칭 점수
}

export interface LLMTripPoiList {
  pois: TripPoiCandidate[] // LLM 이 제시한 전체 (D29 의 "12 / 23" 의 23)
  note: string // 친구 톤 멘트 (voice 인용 보완)
}
