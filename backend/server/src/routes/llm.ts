// Phase 3.5 (D22) — Hono route = createLLMFunction 호출 wrapper.
//
// 모든 spawn/parse/whitelist/mock 로직은 backend/server/llm/ 으로 이전.
// SSE wire format 유지 (event: start → raw → final → done).

import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { recommendCities } from '../../llm/functions/recommend-cities'
import { recommendPois } from '../../llm/functions/recommend-pois'

const llmRoutes = new Hono()

// ---------------------------------------------------------------------------
// POST /api/llm — POI 추천 (D2 strict)
// ---------------------------------------------------------------------------
llmRoutes.post('/', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }

  return streamSSE(c, async (stream) => {
    const candidates =
      raw &&
      typeof raw === 'object' &&
      Array.isArray((raw as { candidatePois?: unknown }).candidatePois)
        ? (raw as { candidatePois: unknown[] }).candidatePois.length
        : 0
    await stream.writeSSE({ event: 'start', data: JSON.stringify({ candidates }) })

    try {
      const { result, hallucinationDetected, trace } = await recommendPois(
        raw as Parameters<typeof recommendPois>[0],
      )
      await stream.writeSSE({ event: 'raw', data: JSON.stringify({ trace }) })
      await stream.writeSSE({ event: 'final', data: JSON.stringify(result) })
      await stream.writeSSE({ event: 'done', data: JSON.stringify({ hallucinationDetected }) })
    } catch (err) {
      console.warn('[llm] recommendPois threw', err)
      const fallback = {
        recommended_ids: [] as string[],
        note: '음, 잠깐만요. 지금 후보를 다시 살피고 있어요.',
      }
      await stream.writeSSE({ event: 'final', data: JSON.stringify(fallback) })
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ hallucinationDetected: false }),
      })
    }
  })
})

// ---------------------------------------------------------------------------
// POST /api/llm/cities — D21 도시 추천 (SCENARIO 02)
// ---------------------------------------------------------------------------
llmRoutes.post('/cities', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ event: 'start', data: JSON.stringify({ phase: 'cities' }) })

    try {
      const { result, hallucinationDetected, trace } = await recommendCities(
        raw as Parameters<typeof recommendCities>[0],
      )
      await stream.writeSSE({ event: 'raw', data: JSON.stringify({ trace }) })
      await stream.writeSSE({ event: 'final', data: JSON.stringify(result) })
      await stream.writeSSE({ event: 'done', data: JSON.stringify({ hallucinationDetected }) })
    } catch (err) {
      console.warn('[llm/cities] recommendCities threw', err)
      const fallback = {
        cities: [
          { name: '강릉', reason: '조용한 새벽 바다, 윤서님 결', match: 92 },
          { name: '통영', reason: '바다와 골목, 천천히 걷기 좋아요', match: 87 },
          { name: '제주 남부', reason: '귤밭과 한적한 해안', match: 82 },
          { name: '거제', reason: '섬 사이 조용한 풍경', match: 77 },
        ],
        note: '비슷한 결, 다른 결로 섞었어요.',
      }
      await stream.writeSSE({ event: 'final', data: JSON.stringify(fallback) })
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ hallucinationDetected: false }),
      })
    }
  })
})

export { llmRoutes }
