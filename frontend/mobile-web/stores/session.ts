import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { AlertEvent, Glow, MomentCard, Turn } from '@trip/types'

/**
 * Session store — companion + conversation + alert-queue 통합 (D5)
 *
 * D36 갱신: `onboarded?: boolean` 옵셔널 + AsyncStorage persist 추가.
 *   - partialize 로 `onboarded` 만 persist (turns/alertQueue/currentCard 는 ephemeral)
 *   - 기존 caller (companion.tsx, services/companion/state.ts) 영향 0 — 옵셔널 필드
 *
 * 시그니처 freeze (D12): 기존 필드/액션 변경 X · `onboarded` + `setOnboarded` 만 추가.
 */
interface SessionStore {
  glow: Glow
  currentCard: MomentCard | null
  turns: Turn[]
  alertQueue: AlertEvent[]
  lastWeatherCheck: number
  onboarded?: boolean
  pushAlert: (event: AlertEvent) => void
  acknowledgeAlert: () => void
  setGlow: (glow: Glow) => void
  appendTurn: (turn: Turn) => void
  setOnboarded: (v: boolean) => void
}

export const useSession = create<SessionStore>()(
  persist(
    (set) => ({
      glow: 'normal',
      currentCard: null,
      turns: [],
      alertQueue: [],
      lastWeatherCheck: 0,
      onboarded: undefined,
      pushAlert: (event) => set((s) => ({ alertQueue: [...s.alertQueue, event] })),
      acknowledgeAlert: () => set((s) => ({ alertQueue: s.alertQueue.slice(1) })),
      setGlow: (glow) => set({ glow }),
      appendTurn: (turn) => set((s) => ({ turns: [...s.turns, turn] })),
      setOnboarded: (v) => set({ onboarded: v }),
    }),
    {
      name: 'session',
      storage: createJSONStorage(() => AsyncStorage),
      // onboarded 만 persist — 나머지 state 는 세션 종료 시 휘발
      partialize: (s) => ({ onboarded: s.onboarded }),
    },
  ),
)
