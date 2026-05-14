import type { AlertEvent, CardType, Glow } from '@trip/types'

/**
 * D6 — 컴패니언 카드 state machine (pure function).
 *
 * 입력만으로 다음 (glow, cardType) 결정. side effect 없음.
 *
 * 전이 룰 (ENG-PLAN.md line 173-178):
 *  - NORMAL → ALERT: weather-alert | poi-closed (외부 트리거)
 *  - ALERT → RESCUE: rescue-utterance (ALERT 우선순위 ↓, 사용자가 RESCUE 발화)
 *  - NORMAL → RESCUE: rescue-utterance (ALERT 거치지 않고 바로 발화한 케이스)
 *  - RESCUE → NORMAL: ack
 *  - ALERT → NORMAL: ack | timeout
 *  - * → AWAY: offline (직교 — 어느 state 든)
 *  - AWAY → NORMAL: online (단순화 — 직전 state 복원은 v2)
 */
export function resolveNextCard(
  current: { glow: Glow; cardType: CardType },
  event: {
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
  // offline 은 어느 state 든 즉시 AWAY
  if (event.kind === 'offline') {
    return { glow: 'away', cardType: 'AWAY' }
  }

  // online 은 AWAY 에서만 의미. AWAY → NORMAL
  if (event.kind === 'online') {
    if (current.cardType === 'AWAY') return { glow: 'normal', cardType: 'NORMAL' }
    return current
  }

  // rescue-utterance 는 NORMAL/ALERT 어디서든 RESCUE 로
  if (event.kind === 'rescue-utterance') {
    if (current.cardType === 'AWAY') return current // 네트워크 끊긴 동안엔 무효
    return { glow: 'rescue', cardType: 'RESCUE' }
  }

  // weather-alert / poi-closed → ALERT (NORMAL 에서만 의미. ALERT/RESCUE 중복 무효)
  if (event.kind === 'weather-alert' || event.kind === 'poi-closed') {
    if (current.cardType === 'NORMAL') return { glow: 'alert', cardType: 'ALERT' }
    return current
  }

  // ack — ALERT/RESCUE 둘 다 NORMAL 로 복귀
  if (event.kind === 'ack') {
    if (current.cardType === 'ALERT' || current.cardType === 'RESCUE') {
      return { glow: 'normal', cardType: 'NORMAL' }
    }
    return current
  }

  // timeout — ALERT 만 NORMAL 로 (RESCUE 는 사용자 ack 필요)
  if (event.kind === 'timeout') {
    if (current.cardType === 'ALERT') return { glow: 'normal', cardType: 'NORMAL' }
    return current
  }

  return current
}
