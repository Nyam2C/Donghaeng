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
