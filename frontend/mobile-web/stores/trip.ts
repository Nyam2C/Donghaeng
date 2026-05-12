import { create } from 'zustand'

import type { GpsCoord, Trip } from '@trip/types'

interface TripStore {
  active: Trip | null
  currentLocation: GpsCoord | null
  startTrip: (trip: Trip) => void
  endTrip: () => void
  setLocation: (gps: GpsCoord) => void
}

export const useTrip = create<TripStore>((set) => ({
  active: null,
  currentLocation: null,
  startTrip: (trip) => set({ active: trip }),
  endTrip: () => set({ active: null, currentLocation: null }),
  setLocation: (gps) => set({ currentLocation: gps }),
}))
