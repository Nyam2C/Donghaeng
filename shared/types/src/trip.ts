// @trip/types — Trip + GPS

/**
 * 여행 탭 mode router (D27) 의 active 여행 step.
 *  - 'dates'   : SCENARIO 02.5 날짜+일자별 날씨 (TRIP START 도시 선택 후, D33)
 *  - 'pois'    : SCENARIO 03 POI 큐레이션 (날짜 결정 후 좋아요 모으는 중)
 *  - 'routes'  : SCENARIO 04 동선 선택 (♥≥3 후 Plan A/B/C)
 *  - 'on_trip' : 현장 컴패니언 (실제 여행 중 — Phase 4c 산출물)
 *
 * undefined / 미설정 시 mode router 는 'on_trip' 으로 해석 (legacy caller 호환).
 */
export type TripPlanningStep = 'dates' | 'pois' | 'routes' | 'on_trip'

export interface Trip {
  city: string
  startDate: string
  endDate: string
  vibeTags: string[]
  /** D27 옵셔널 — mode router 가 active 여행의 현재 단계 결정 */
  planning_step?: TripPlanningStep
}

export interface GpsCoord {
  lat: number
  lng: number
  accuracy?: number
}
