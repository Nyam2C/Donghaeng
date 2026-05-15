// @trip/types — In-context personalization (D5 persist + AsyncStorage)

/**
 * POI 메타 — D40 (v1.8) 좋아요한 POI 의 표시 이름/카테고리 캐시.
 * `useUserStyle.likedPois` 에 누적 → SCENARIO 04 recommendRoutes 가 poiNames 로 전달 →
 * LLM 이 stop.name 에 진짜 POI 이름 박음 → 편지 일정 본문에 자연스러운 한국어 이름.
 */
export interface LikedPoiMeta {
  /** 사용자 친화 이름 ("안목 해변" / "테라로사 사천해변점") */
  name: string
  /** 카테고리 ("카페" / "맛집" / "관광") — 옵셔널 */
  category?: string
}

export interface UserStyle {
  tags: string[]
  likedPoiIds: string[]
  dislikedPoiIds: string[]
  /** D40 (v1.8) 옵셔널 — likedPoiIds 와 1:1. id → meta lookup 용. 기존 caller 0 영향. */
  likedPois?: Record<string, LikedPoiMeta>
}
