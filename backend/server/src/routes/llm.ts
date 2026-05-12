// Phase 3 Day 7 — Claude CLI spawn + D2 recommended_ids JSON 강제
// POST /api/llm
//   body:  { userStyle, utterance, candidatePois }
//   →      SSE stream of LLMRecommendation (D2 strict)

import type { LLMRecommendation } from '@trip/types'
import { Hono } from 'hono'

// Phase 3 Day 7 응답 시그니처: SSE stream of LLMRecommendation (D2 strict)
export type LLMResponse = LLMRecommendation

const llmRoutes = new Hono()

llmRoutes.post('/', (c) => {
  return c.json(
    { stub: true, target: 'Phase 3 Day 7 — Claude CLI spawn + D2 recommended_ids JSON 강제' },
    501,
  )
})

export { llmRoutes }
