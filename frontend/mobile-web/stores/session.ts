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
 * D39 갱신 (P3 polish): turns 도 persist (cap 50) — 앱 재시작 후 첫 인사 매번 발생 fix.
 *   appendTurn 이 max 50 cap 자동 적용 (D2 chat-conversation history 50 turns 와 일관).
 *
 * 시그니처 freeze (D12): 기존 필드/액션 변경 X · onboarded/setOnboarded · turns persist 만 추가.
 */

const TURNS_CAP = 50
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
      appendTurn: (turn) =>
        set((s) => {
          const next = [...s.turns, turn]
          // D39 — cap 50. tail 50 만 보존 (history.max 50 와 일관).
          return { turns: next.length > TURNS_CAP ? next.slice(-TURNS_CAP) : next }
        }),
      setOnboarded: (v) => set({ onboarded: v }),
    }),
    {
      name: 'session',
      storage: createJSONStorage(() => AsyncStorage),
      // D39 — onboarded + turns persist. alertQueue/currentCard/glow 는 ephemeral.
      partialize: (s) => ({ onboarded: s.onboarded, turns: s.turns }),
    },
  ),
)
