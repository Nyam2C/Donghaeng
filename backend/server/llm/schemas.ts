// Phase 3.5 (D22) — zod schema re-export + 한국 도시 whitelist
//
// zod 정의는 @trip/types/agent 가 single source-of-truth. 여기는 server 전용 상수만.

export {
  ChatConversationInputSchema,
  ChatIntentSchema,
  ChatTripContextSchema,
  CityCandidateSchema,
  IntentExtractionInputSchema,
  KakaoPOIRefSchema,
  LLMChatResponseSchema,
  LLMCityRecommendationSchema,
  LLMIntentExtractionSchema,
  LLMRecommendationSchema,
  LLMRouteListSchema,
  LLMRouteSchema,
  LLMRouteStopSchema,
  LLMRouteUpdateSchema,
  LLMTripPoiListSchema,
  RecommendCitiesInputSchema,
  RecommendPoisInputSchema,
  RecommendRoutesInputSchema,
  RecommendTripPoisInputSchema,
  TripPoiCandidateSchema,
  TurnSchema,
  UpdateRouteInputSchema,
  UserStyleSchema,
  type ChatConversationInput,
  type ChatTripContext,
  type IntentExtractionInput,
  type RecommendCitiesInput,
  type RecommendPoisInput,
  type RecommendRoutesInput,
  type RecommendTripPoisInput,
  type UpdateRouteInput,
} from '@trip/types'

// ---------------------------------------------------------------------------
// 한국 도시 whitelist — D21 hallucination 방지 정합
// 광역시도 17 + 동행 여행 맥락 자주 등장하는 시군구 + 제주 권역
// ---------------------------------------------------------------------------

export const KOREAN_CITY_WHITELIST: readonly string[] = [
  // 광역시도 17
  '서울',
  '부산',
  '대구',
  '인천',
  '광주',
  '대전',
  '울산',
  '세종',
  '경기',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
  // 강원
  '강릉',
  '속초',
  '양양',
  '평창',
  '춘천',
  '원주',
  '동해',
  '삼척',
  '정선',
  '횡성',
  '홍천',
  '인제',
  '고성',
  // 경상
  '경주',
  '안동',
  '포항',
  '울진',
  '영주',
  '문경',
  '상주',
  '거제',
  '통영',
  '남해',
  '하동',
  '진주',
  '창원',
  '김해',
  '양산',
  '밀양',
  // 전라
  '전주',
  '여수',
  '순천',
  '목포',
  '담양',
  '광양',
  '곡성',
  '구례',
  '군산',
  '익산',
  '남원',
  '고창',
  '부안',
  '완도',
  '진도',
  '보성',
  // 충청
  '단양',
  '제천',
  '충주',
  '청주',
  '공주',
  '부여',
  '서산',
  '태안',
  '보령',
  '논산',
  '천안',
  '아산',
  // 경기/인천 주요
  '가평',
  '양평',
  '파주',
  '강화',
  '안성',
  '평택',
  '수원',
  '용인',
  '광주시',
  '여주',
  '포천',
  // 제주
  '제주 남부',
  '제주 동부',
  '제주 서부',
  '제주 북부',
  '서귀포',
  '제주시',
  // 기타 여행 빈출
  '울릉',
  '독도',
] as const

export const KOREAN_CITY_SET: ReadonlySet<string> = new Set<string>(KOREAN_CITY_WHITELIST)

/**
 * Whitelist 검증 — 공백/특수문자 split 의 *어느 토큰이라도* whitelist 에 있으면 통과.
 * 예: "서울" ✓ · "서울 성수" ✓ · "부산 해운대" ✓ · "제주 남부" ✓
 *    · "설악산 속초" ✓ (속초) · "지리산 함양" ✓ (함양) · "도쿄" ✗ · "오사카 도톤보리" ✗
 */
export function isKoreanCity(name: string): boolean {
  if (KOREAN_CITY_SET.has(name)) return true
  const tokens = name.split(/[\s,·]+/).filter((t) => t.length > 0)
  return tokens.some((t) => KOREAN_CITY_SET.has(t))
}
