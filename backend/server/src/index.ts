import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { intentRoutes } from './routes/intent'
import { llmRoutes } from './routes/llm'
import { poiRoutes } from './routes/poi'
import { ttsProxyRoutes } from './routes/tts-proxy'
import { weatherRoutes } from './routes/weather'

const app = new Hono()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:3000',
      'http://127.0.0.1:8081',
      'http://127.0.0.1:19006',
    ],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400,
  }),
)

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
