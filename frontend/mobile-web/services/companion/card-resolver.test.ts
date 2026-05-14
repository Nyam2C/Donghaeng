import { describe, expect, it } from 'bun:test'

import { resolveNextCard } from './card-resolver'

/**
 * D6 state machine 8 케이스. bun test 호환 (`bun test`).
 *
 * 전이 매트릭스 (ENG-PLAN line 173-178):
 *  - NORMAL → ALERT: weather-alert | poi-closed
 *  - ALERT → RESCUE: rescue-utterance
 *  - NORMAL → RESCUE: rescue-utterance
 *  - RESCUE → NORMAL: ack
 *  - ALERT → NORMAL: ack | timeout
 *  - * → AWAY: offline
 *  - AWAY → NORMAL: online
 *  - ALERT during RESCUE: 무효 (RESCUE 유지)
 */
describe('resolveNextCard (D6 state machine)', () => {
  const NORMAL = { glow: 'normal' as const, cardType: 'NORMAL' as const }
  const ALERT = { glow: 'alert' as const, cardType: 'ALERT' as const }
  const RESCUE = { glow: 'rescue' as const, cardType: 'RESCUE' as const }
  const AWAY = { glow: 'away' as const, cardType: 'AWAY' as const }

  it('NORMAL → ALERT on weather-alert', () => {
    expect(resolveNextCard(NORMAL, { kind: 'weather-alert' })).toEqual(ALERT)
  })

  it('NORMAL → ALERT on poi-closed', () => {
    expect(resolveNextCard(NORMAL, { kind: 'poi-closed' })).toEqual(ALERT)
  })

  it('ALERT → RESCUE on rescue-utterance', () => {
    expect(resolveNextCard(ALERT, { kind: 'rescue-utterance' })).toEqual(RESCUE)
  })

  it('NORMAL → RESCUE on rescue-utterance (직접 진입)', () => {
    expect(resolveNextCard(NORMAL, { kind: 'rescue-utterance' })).toEqual(RESCUE)
  })

  it('RESCUE → NORMAL on ack', () => {
    expect(resolveNextCard(RESCUE, { kind: 'ack' })).toEqual(NORMAL)
  })

  it('ALERT → NORMAL on ack', () => {
    expect(resolveNextCard(ALERT, { kind: 'ack' })).toEqual(NORMAL)
  })

  it('ALERT → NORMAL on timeout', () => {
    expect(resolveNextCard(ALERT, { kind: 'timeout' })).toEqual(NORMAL)
  })

  it('* → AWAY on offline (NORMAL)', () => {
    expect(resolveNextCard(NORMAL, { kind: 'offline' })).toEqual(AWAY)
  })

  it('* → AWAY on offline (ALERT)', () => {
    expect(resolveNextCard(ALERT, { kind: 'offline' })).toEqual(AWAY)
  })

  it('AWAY → NORMAL on online', () => {
    expect(resolveNextCard(AWAY, { kind: 'online' })).toEqual(NORMAL)
  })

  it('RESCUE 중 weather-alert 는 무효 (RESCUE 유지)', () => {
    expect(resolveNextCard(RESCUE, { kind: 'weather-alert' })).toEqual(RESCUE)
  })

  it('RESCUE 중 timeout 은 무효 (사용자 ack 필요)', () => {
    expect(resolveNextCard(RESCUE, { kind: 'timeout' })).toEqual(RESCUE)
  })

  it('NORMAL 에서 ack 는 no-op', () => {
    expect(resolveNextCard(NORMAL, { kind: 'ack' })).toEqual(NORMAL)
  })

  it('AWAY 에서 rescue-utterance 는 무효 (네트워크 끊김)', () => {
    expect(resolveNextCard(AWAY, { kind: 'rescue-utterance' })).toEqual(AWAY)
  })
})
