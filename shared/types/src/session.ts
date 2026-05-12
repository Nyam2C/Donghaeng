// @trip/types — Session payload (D5 통합 store: companion + conversation + alert-queue)

import type { LLMRecommendation } from './llm'

export interface Turn {
  ts: number
  speaker: 'user' | 'companion'
  text: string
  isAlertEntry?: boolean
}

export interface AlertEvent {
  ts: number
  type: 'weather' | 'poi-closed'
  detail: string
  altRecommendation?: LLMRecommendation
}
