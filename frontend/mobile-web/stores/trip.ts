import { create } from 'zustand'

import type { GpsCoord, LLMRoute, Trip, TripPlanningStep } from '@trip/types'

/**
 * D27 — 여행 탭 mode router state. planning_step 은 active 가 있을 때만 의미 있음.
 *
 * 시그니처 freeze (D12): 기존 startTrip/endTrip/setLocation 그대로.
 *  - D27: setPlanningStep 추가
 *  - D34: activeRoute + setActiveRoute 추가 (옵셔널, 기존 caller 0 영향).
 *         SCENARIO 04 의 RouteCard 선택 시 / SCENARIO 08 의 "이대로" 확정 시 갱신.
 */
interface TripStore {
  active: Trip | null
  currentLocation: GpsCoord | null
  /** D34 — 현재 ON-TRIP 동선 (사용자가 선택한 Plan A/B/C 또는 채팅으로 update 된 결과). */
  activeRoute: LLMRoute | null
  startTrip: (trip: Trip) => void
  endTrip: () => void
  setLocation: (gps: GpsCoord) => void
  setPlanningStep: (step: TripPlanningStep) => void
  setActiveRoute: (route: LLMRoute | null) => void
}

export const useTrip = create<TripStore>((set) => ({
  active: null,
  currentLocation: null,
  activeRoute: null,
  startTrip: (trip) => set({ active: trip }),
  endTrip: () => set({ active: null, currentLocation: null, activeRoute: null }),
  setLocation: (gps) => set({ currentLocation: gps }),
  setPlanningStep: (step) =>
    set((s) => (s.active ? { active: { ...s.active, planning_step: step } } : s)),
  setActiveRoute: (route) => set({ activeRoute: route }),
}))
