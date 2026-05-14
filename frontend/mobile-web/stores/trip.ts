import { create } from 'zustand'

import type { GpsCoord, Trip, TripPlanningStep } from '@trip/types'

/**
 * D27 — 여행 탭 mode router state. planning_step 은 active 가 있을 때만 의미 있음.
 *
 * 시그니처 freeze (D12): 기존 startTrip/endTrip/setLocation 그대로. setPlanningStep 신규 추가만.
 * 기존 caller 0 영향 (옵셔널 동작 — startTrip 호출 후 planning_step 미설정이면 'on_trip' 해석).
 */
interface TripStore {
  active: Trip | null
  currentLocation: GpsCoord | null
  startTrip: (trip: Trip) => void
  endTrip: () => void
  setLocation: (gps: GpsCoord) => void
  setPlanningStep: (step: TripPlanningStep) => void
}

export const useTrip = create<TripStore>((set) => ({
  active: null,
  currentLocation: null,
  startTrip: (trip) => set({ active: trip }),
  endTrip: () => set({ active: null, currentLocation: null }),
  setLocation: (gps) => set({ currentLocation: gps }),
  setPlanningStep: (step) =>
    set((s) => (s.active ? { active: { ...s.active, planning_step: step } } : s)),
}))
