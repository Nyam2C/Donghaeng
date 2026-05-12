import { Hono } from 'hono'
import { logger } from 'hono/logger'

const app = new Hono()

app.use('*', logger())

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'server',
    ts: Date.now(),
  }),
)

// Phase 3+ 에서 채울 routes (D12 Scaffold Day Day 3에 stub 추가):
//   /api/llm        — Claude Code CLI spawn (D2 ID validation)
//   /api/intent     — D4 intent extraction
//   /api/poi        — Kakao Local proxy
//   /api/weather    — OpenWeather proxy (D3 foreground catchup)
//   /api/tts-proxy  — ai-tts:8000/synthesize 중계

export default {
  port: 3000,
  fetch: app.fetch,
}
