// Phase 5a Day 15 — D4 intent extraction LLM 1-turn
// POST /api/intent
//   body:  { asrText }
//   →      IntentExtraction

import type { IntentExtraction } from '@trip/types'
import { Hono } from 'hono'

// Phase 5a Day 15 응답 시그니처
export type IntentResponse = IntentExtraction

const intentRoutes = new Hono()

intentRoutes.post('/', (c) => {
  return c.json({ stub: true, target: 'Phase 5a Day 15 — D4 intent extraction LLM 1-turn' }, 501)
})

export { intentRoutes }
