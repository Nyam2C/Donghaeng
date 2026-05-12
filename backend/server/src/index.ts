import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { intentRoutes } from './routes/intent'
import { llmRoutes } from './routes/llm'
import { poiRoutes } from './routes/poi'
import { ttsProxyRoutes } from './routes/tts-proxy'
import { weatherRoutes } from './routes/weather'

const app = new Hono()

app.use('*', logger())

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'server',
    ts: Date.now(),
  }),
)

app.route('/api/llm', llmRoutes)
app.route('/api/intent', intentRoutes)
app.route('/api/poi', poiRoutes)
app.route('/api/weather', weatherRoutes)
app.route('/api/tts-proxy', ttsProxyRoutes)

export default {
  port: 3000,
  fetch: app.fetch,
}
