import { create } from 'zustand'

import type { AlertEvent, Glow, MomentCard, Turn } from '@trip/types'

interface SessionStore {
  glow: Glow
  currentCard: MomentCard | null
  turns: Turn[]
  alertQueue: AlertEvent[]
  lastWeatherCheck: number
  pushAlert: (event: AlertEvent) => void
  acknowledgeAlert: () => void
  setGlow: (glow: Glow) => void
  appendTurn: (turn: Turn) => void
}

export const useSession = create<SessionStore>((set) => ({
  glow: 'normal',
  currentCard: null,
  turns: [],
  alertQueue: [],
  lastWeatherCheck: 0,
  pushAlert: (event) => set((s) => ({ alertQueue: [...s.alertQueue, event] })),
  acknowledgeAlert: () => set((s) => ({ alertQueue: s.alertQueue.slice(1) })),
  setGlow: (glow) => set({ glow }),
  appendTurn: (turn) => set((s) => ({ turns: [...s.turns, turn] })),
}))
