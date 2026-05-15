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

// D29 — SCENARIO 04 동선 선택 (POI 좋아요 ≥3 후 3 갈래 동선 추천)
// 친구 톤 voice "선택지마다 리듬이 달라요. 어느 결이 끌려요?" 약속.
// AI 가 likedPoiIds 만 stops 로 묶어서 3 갈래 동선 (Plan A/B/C) 제시.
export interface LLMRouteStop {
  poi_id: string // likedPoiIds ⊂ 검증 (D2)
  order: number // 1-based, route 내 방문 순서
  /** D38 — 편지 일정 (SPECIAL v1.6) 용 표시 이름. POI 사용자 친화 라벨 ("안목 해변" 등).
   *  옵셔널 — 미설정 시 frontend 는 poi_id slug 또는 placeholder. 기존 caller 0 영향. */
  name?: string
  /** D38 — 편지 일정 (SPECIAL v1.6) 용 시간 힌트. HH:MM (예: "11:30"). LLM 이 동선 짤 때 함께 제시.
   *  옵셔널 — 미설정 시 day 안 stop order 로 균등 분배. 기존 caller 0 영향. */
  timeHint?: string
}

export interface LLMRoute {
  letter: 'A' | 'B' | 'C' // Plan A/B/C
  name: string // 결의 짧은 라벨 (5-12자, "바다 따라" / "빵집 도장깨기" / "한 곳 깊게")
  reason: string // 친구 톤 짧은 이유 (15-30자)
  stops: LLMRouteStop[] // 3-6 stops, poi_id ⊂ likedPoiIds
  travelMin: number // 총 이동 시간 (분, 60-360)
  moodStars: number // 1-5 무드 별점 (정수)
  /** D29 polish — design-preview 의 stats 표기 "차분함 ★★★" 의 mood 이름.
   *  옵셔널 — 기존 caller 0 영향. 미설정 시 frontend 는 별점만 표시. */
  moodLabel?: string
}

export interface LLMRouteList {
  routes: LLMRoute[] // 정확히 3개 (A/B/C)
  note: string // 친구 톤 멘트 (15-30자)
}

// D32 — Phase 5a SCENARIO 07-CHAT (채팅 default)
// 친구 톤 대화 응답 — 사용자 history + tripContext + userStyle 인지.
export interface LLMChatResponse {
  response: string // 친구 톤 응답 (15-200자)
}

// D34 — Phase 5b SCENARIO 08 (대화로 동선 변경)
// 사용자 발화 ("정동진도 가고 싶어") → intent 'add_poi' 감지 → 동선 재계산.
export type ChatIntent = 'add_poi' | 'remove_poi' | 'change_day' | 'continue' | 'show_map'

export interface LLMIntentExtraction {
  intent: ChatIntent
  // intent === 'add_poi' 시: 추가하려는 POI 이름 (사용자 발화에서 추출)
  poiName?: string
  // intent === 'remove_poi' 시: 제거 대상 POI 이름
  removeName?: string
  // intent === 'change_day' 시: 변경 대상 day (1-based)
  targetDay?: number
}

// 동선 update 결과 — 변경된 새 LLMRoute + 친구 톤 약속 멘트
export interface LLMRouteUpdate {
  route: LLMRoute // 갱신된 동선 (기존 stops + 새 stop 추가)
  addedStopName?: string // 추가된 stop 의 이름 (사용자에게 표시)
  note: string // 친구 톤 멘트 (15-30자)
}

// D39 (v2.1) — ★ SPECIAL 편지 일정 LLM 생성. day 별 friend-tone 본문 paragraphs.
// design-preview line 2074-2135 의 letter-body 직역 — 1인칭 명조 톤.
// fallback: frontend client-side template 가 LLM 미설치/실패 시 사용 (loading state).
export interface LLMLetter {
  /** 각 paragraph 는 한 stop 또는 한 호흡. 2-6 paragraph 권장. inline marker:
   *  - "{TIME:HH:MM}" → DM Mono 시간 표시
   *  - "{PLACE:이름}"  → italic celadon 장소 표시 (점선 밑줄 v2.2 옵션)
   *  - "{EM:강조어}"    → italic celadon 강조 ("조용한 책방" 같은 결)
   * marker 없는 텍스트는 Noto Serif KR body. frontend 가 parse 해서 segment 별 스타일. */
  paragraphs: string[]
  /** 서명 — design-preview "— 오늘의 동행" default. LLM 이 다른 호흡 선택 가능 ("— 동행"). */
  signature: string
}
