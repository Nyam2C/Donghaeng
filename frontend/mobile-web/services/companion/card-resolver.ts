import type { AlertEvent, CardType, Glow } from '@trip/types'

export function resolveNextCard(
  _current: { glow: Glow; cardType: CardType },
  _event: {
    kind:
      | 'weather-alert'
      | 'poi-closed'
      | 'rescue-utterance'
      | 'ack'
      | 'timeout'
      | 'offline'
      | 'online'
    payload?: AlertEvent
  },
): { glow: Glow; cardType: CardType } {
  throw new Error('NotImplemented · Phase 4 타겟 (D6 state machine)')
}
