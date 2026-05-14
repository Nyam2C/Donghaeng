// @trip/types/agent — Phase 3.5 (D22) — zod single source-of-truth
//
// 기존 llm.ts 의 interface 는 그대로 유지 (frontend 호환). 이 파일은
// backend/server/llm/ 에서 createLLMFunction<I, O> 가 입출력 검증에 쓰는
// zod schema 모음. shape 는 llm.ts 의 interface 와 isomorphic.
//
// 새 함수 추가 시:
// 1. 여기에 zod schema 정의
// 2. 동일 shape 를 llm.ts 에 interface 로 미러 (frontend import 안전)
// 3. backend/server/llm/functions/<name>.ts 에 factory 적용

import { z } from 'zod'

// ---------------------------------------------------------------------------
// POI 추천 (POST /api/llm)
// llm.ts: LLMRecommendation { recommended_ids, note }
// ---------------------------------------------------------------------------

export const LLMRecommendationSchema = z.object({
  recommended_ids: z.array(z.string()),
  note: z.string(),
})

// 입력
export const UserStyleSchema = z.object({
  tags: z.array(z.string()),
  likedPoiIds: z.array(z.string()),
  dislikedPoiIds: z.array(z.string()),
})

export const KakaoPOIRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().optional().default(''),
  category: z.string().optional().default(''),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export const RecommendPoisInputSchema = z.object({
  userStyle: UserStyleSchema,
  utterance: z.string(),
  candidatePois: z.array(KakaoPOIRefSchema),
})

export type RecommendPoisInput = z.infer<typeof RecommendPoisInputSchema>

// ---------------------------------------------------------------------------
// 도시 추천 (POST /api/llm/cities) — D21
// llm.ts: CityCandidate / LLMCityRecommendation
// ---------------------------------------------------------------------------

export const CityCandidateSchema = z.object({
  name: z.string(),
  reason: z.string(),
  match: z.number(),
})

export const LLMCityRecommendationSchema = z.object({
  cities: z.array(CityCandidateSchema),
  note: z.string(),
})

export const RecommendCitiesInputSchema = z.object({
  userStyle: UserStyleSchema,
  utterance: z.string(),
})

export type RecommendCitiesInput = z.infer<typeof RecommendCitiesInputSchema>
