import type { AlertEvent, Glow, Turn } from '@trip/types'

import { useSession } from '@/stores/session'

/**
 * session store action 4종 wrapper.
 * useSession 의 action 만 노출 (state 는 노출 X — caller 가 직접 useSession 으로 selector).
 */
export const useCompanionActions: () => {
  pushAlert: (event: AlertEvent) => void
  acknowledgeAlert: () => void
  setGlow: (glow: Glow) => void
  appendTurn: (turn: Turn) => void
} = () => {
  const pushAlert = useSession((s) => s.pushAlert)
  const acknowledgeAlert = useSession((s) => s.acknowledgeAlert)
  const setGlow = useSession((s) => s.setGlow)
  const appendTurn = useSession((s) => s.appendTurn)
  return { pushAlert, acknowledgeAlert, setGlow, appendTurn }
}
