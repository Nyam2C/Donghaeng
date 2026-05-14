// Phase 3.5 (D22) — Hono route = createLLMFunction 호출 wrapper.
//
// 모든 spawn/parse/whitelist/mock 로직은 backend/server/llm/ 으로 이전.
// SSE wire format 유지 (event: start → raw → final → done).

import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { chatConversation } from '../../llm/functions/chat-conversation'
import { intentExtract } from '../../llm/functions/intent-extract'
import { recommendCities } from '../../llm/functions/recommend-cities'
import { recommendPois } from '../../llm/functions/recommend-pois'
import { recommendRoutes } from '../../llm/functions/recommend-routes'
import { recommendTripPois } from '../../llm/functions/recommend-trip-pois'
import { updateRoute } from '../../llm/functions/update-route'

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

// ---------------------------------------------------------------------------
// POST /api/llm/trip-pois — D29 짜는 단계 POI 큐레이션 (SCENARIO 03)
// ---------------------------------------------------------------------------
llmRoutes.post('/trip-pois', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }

  return streamSSE(c, async (stream) => {
    const city =
      raw && typeof raw === 'object' && typeof (raw as { city?: unknown }).city === 'string'
        ? (raw as { city: string }).city
        : null
    await stream.writeSSE({ event: 'start', data: JSON.stringify({ phase: 'trip-pois', city }) })

    try {
      const { result, hallucinationDetected, trace, kakaoPoolSize, kakaoFetchFailed } =
        await recommendTripPois(raw as Parameters<typeof recommendTripPois>[0])
      await stream.writeSSE({
        event: 'raw',
        data: JSON.stringify({ trace, kakaoPoolSize, kakaoFetchFailed }),
      })
      await stream.writeSSE({ event: 'final', data: JSON.stringify(result) })
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ hallucinationDetected, kakaoFetchFailed }),
      })
    } catch (err) {
      console.warn('[llm/trip-pois] recommendTripPois threw', err)
      const fallback = {
        pois: [
          {
            id: 'mock-fallback-1',
            name: '시내 카페거리',
            category: '카페',
            reason: '한적한 분위기 그 결',
            match: 80,
          },
          {
            id: 'mock-fallback-2',
            name: '전통 시장',
            category: '맛집',
            reason: '동네 손맛 진짜',
            match: 82,
          },
          {
            id: 'mock-fallback-3',
            name: '박물관',
            category: '문화',
            reason: '이 동네 이야기',
            match: 78,
          },
          {
            id: 'mock-fallback-4',
            name: '자연 산책로',
            category: '관광',
            reason: '걷기 좋은 길',
            match: 80,
          },
          {
            id: 'mock-fallback-5',
            name: '야경 명소',
            category: '관광',
            reason: '저녁 빛 좋아요',
            match: 81,
          },
        ],
        note: '잠깐, 후보를 다시 골라봤어요',
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
// POST /api/llm/routes — D29 SCENARIO 04 동선 선택 (Plan A/B/C)
// ---------------------------------------------------------------------------
llmRoutes.post('/routes', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }

  return streamSSE(c, async (stream) => {
    const likedCount =
      raw &&
      typeof raw === 'object' &&
      Array.isArray((raw as { likedPoiIds?: unknown }).likedPoiIds)
        ? (raw as { likedPoiIds: unknown[] }).likedPoiIds.length
        : 0
    await stream.writeSSE({ event: 'start', data: JSON.stringify({ likedCount }) })

    try {
      const { result, hallucinationDetected, trace } = await recommendRoutes(
        raw as Parameters<typeof recommendRoutes>[0],
      )
      await stream.writeSSE({ event: 'raw', data: JSON.stringify({ trace }) })
      await stream.writeSSE({ event: 'final', data: JSON.stringify(result) })
      await stream.writeSSE({ event: 'done', data: JSON.stringify({ hallucinationDetected }) })
    } catch (err) {
      console.warn('[llm/routes] recommendRoutes threw', err)
      const fallback = {
        routes: [] as unknown[],
        note: '음, 잠깐만요. 동선을 다시 짜고 있어요.',
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
// POST /api/llm/chat — D32 SCENARIO 07-CHAT 채팅 대화
// ---------------------------------------------------------------------------
llmRoutes.post('/chat', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ event: 'start', data: JSON.stringify({ phase: 'chat' }) })

    try {
      const { result, hallucinationDetected, trace } = await chatConversation(
        raw as Parameters<typeof chatConversation>[0],
      )
      await stream.writeSSE({ event: 'raw', data: JSON.stringify({ trace }) })
      await stream.writeSSE({ event: 'final', data: JSON.stringify(result) })
      await stream.writeSSE({ event: 'done', data: JSON.stringify({ hallucinationDetected }) })
    } catch (err) {
      console.warn('[llm/chat] chatConversation threw', err)
      const fallback = { response: '음, 잠깐만요. 다시 한번 말해줄래요?' }
      await stream.writeSSE({ event: 'final', data: JSON.stringify(fallback) })
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ hallucinationDetected: false }),
      })
    }
  })
})

// ---------------------------------------------------------------------------
// POST /api/llm/intent — D34 SCENARIO 08 채팅 발화 → action intent 분류
// ---------------------------------------------------------------------------
llmRoutes.post('/intent', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ event: 'start', data: JSON.stringify({ phase: 'intent' }) })

    try {
      const { result, hallucinationDetected, trace } = await intentExtract(
        raw as Parameters<typeof intentExtract>[0],
      )
      await stream.writeSSE({ event: 'raw', data: JSON.stringify({ trace }) })
      await stream.writeSSE({ event: 'final', data: JSON.stringify(result) })
      await stream.writeSSE({ event: 'done', data: JSON.stringify({ hallucinationDetected }) })
    } catch (err) {
      console.warn('[llm/intent] intentExtract threw', err)
      const fallback = { intent: 'continue' as const }
      await stream.writeSSE({ event: 'final', data: JSON.stringify(fallback) })
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ hallucinationDetected: false }),
      })
    }
  })
})

// ---------------------------------------------------------------------------
// POST /api/llm/route-update — D34 SCENARIO 08 동선에 stop 추가 → 재계산
// ---------------------------------------------------------------------------
llmRoutes.post('/route-update', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }

  return streamSSE(c, async (stream) => {
    const currentStops =
      raw &&
      typeof raw === 'object' &&
      raw !== null &&
      'currentRoute' in raw &&
      typeof (raw as { currentRoute?: unknown }).currentRoute === 'object' &&
      (raw as { currentRoute?: { stops?: unknown } }).currentRoute !== null &&
      Array.isArray((raw as { currentRoute: { stops?: unknown } }).currentRoute.stops)
        ? (raw as { currentRoute: { stops: unknown[] } }).currentRoute.stops.length
        : 0
    await stream.writeSSE({
      event: 'start',
      data: JSON.stringify({ phase: 'route-update', currentStops }),
    })

    try {
      const { result, hallucinationDetected, trace } = await updateRoute(
        raw as Parameters<typeof updateRoute>[0],
      )
      await stream.writeSSE({ event: 'raw', data: JSON.stringify({ trace }) })
      await stream.writeSSE({ event: 'final', data: JSON.stringify(result) })
      await stream.writeSSE({ event: 'done', data: JSON.stringify({ hallucinationDetected }) })
    } catch (err) {
      console.warn('[llm/route-update] updateRoute threw', err)
      const fallback = {
        route: null,
        note: '음, 잠깐만요. 동선을 다시 살피고 있어요.',
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
