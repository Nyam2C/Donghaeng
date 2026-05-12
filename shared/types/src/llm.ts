// @trip/types — LLM 추천 응답 (D2 JSON schema 강제)

export interface LLMRecommendation {
  recommended_ids: string[]
  note: string
}
