// Phase 5a Day 15 — ai-tts:8000/synthesize 중계
// POST /api/tts-proxy   body: { text }
//                       → audio/mpeg stream (ai-tts:8000 중계)

import { Hono } from 'hono'

const ttsProxyRoutes = new Hono()

ttsProxyRoutes.post('/', (c) => {
  return c.json({ stub: true, target: 'Phase 5a Day 15 — ai-tts:8000/synthesize 중계' }, 501)
})

export { ttsProxyRoutes }
