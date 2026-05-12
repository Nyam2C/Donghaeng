import type { AlertEvent, Glow, Turn } from '@trip/types'

export const useCompanionActions: () => {
  pushAlert: (event: AlertEvent) => void
  acknowledgeAlert: () => void
  setGlow: (glow: Glow) => void
  appendTurn: (turn: Turn) => void
} = () => {
  throw new Error('NotImplemented · Phase 4 타겟 (session store action wrapper)')
}
