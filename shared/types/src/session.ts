// @trip/types — Session payload (D5 통합 store: companion + conversation + alert-queue)

import type { LLMRecommendation, LLMRouteUpdate } from './llm'

export interface Turn {
  ts: number
  speaker: 'user' | 'companion'
  text: string
  isAlertEntry?: boolean
  /** D34 — 채팅 안 인라인 동선 변경 카드 turn. 지정 시 text 대신 RouteUpdateCard 렌더.
   *  speaker 는 'companion' 으로 고정 운용 (사용자 발화에는 카드 안 박힌다).
   *  옵셔널 — 기존 caller 영향 0 (D12 옵셔널 룰). */
  routeUpdate?: LLMRouteUpdate
}

export interface AlertEvent {
  ts: number
  type: 'weather' | 'poi-closed'
  detail: string
  altRecommendation?: LLMRecommendation
}
