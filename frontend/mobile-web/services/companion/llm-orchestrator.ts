import type {
  ChatIntent,
  CityCandidate,
  KakaoPOI,
  LLMChatResponse,
  LLMCityRecommendation,
  LLMIntentExtraction,
  LLMRecommendation,
  LLMRoute,
  LLMRouteList,
  LLMRouteStop,
  LLMRouteUpdate,
  LLMTripPoiList,
  TripPoiCandidate,
  Turn,
  UserStyle,
} from '@trip/types'

import { apiBaseUrl } from '../api-client'

/**
 * D2 핵심 — Kakao POI id list 만 system prompt 에 전달 → `{recommended_ids, note}` JSON 강제.
 * 응답의 recommended_ids 가 candidatePois.id 안에 모두 있으면 통과, 하나라도 어긋나면 *hallucination* 으로 간주.
 *
 * Wire format (USE_MOCKS=false 시 server `/api/llm` 응답):
 *   SSE 표준 — `data: {"chunk":"..."}\n\n` 반복 + 마지막 `data: {"final":{...}}\n\n`
 *   (Lane B 의 server 가 동일 컨벤션으로 응답해야 함 — Phase 3 sync 필요)
 *
 * USE_MOCKS=true:
 *   __mocks__/api/llm.json 의 단일 LLMRecommendation 을 즉시 final 로 yield (chunk 0개)
 *   note 를 char 단위로 흘려보내 streaming UX 흉내 가능하나 — fixture 단순화 위해 1-shot 으로 간다
 *
 * AsyncGenerator 시그니처 freeze (D12). body 만 구현.
 */

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true'

// Mock fixture 는 require 로 정적 로드 (Metro bundler 호환). api-client 와 동일 패턴.
const MOCK_LLM_FIXTURE: LLMRecommendation =
  require('../__mocks__/api/llm.json') as LLMRecommendation

interface OrchestratorInput {
  userStyle: UserStyle
  utterance: string
  candidatePois: KakaoPOI[]
}

/**
 * D2 검증 — recommended_ids 가 모두 candidatePois.id set 안에 있어야 통과.
 * fail 시 throw — 호출자가 fallback 멘트 처리.
 */
function validateAgainstCandidates(
  rec: LLMRecommendation,
  candidatePois: KakaoPOI[],
): LLMRecommendation {
  const idSet = new Set(candidatePois.map((p) => p.id))
  if (rec.recommended_ids.length === 0) {
    return rec // 빈 추천도 허용 — "지금은 조용해요" 케이스
  }
  const unmatched = rec.recommended_ids.filter((id) => !idSet.has(id))
  if (unmatched.length > 0) {
    throw new Error(
      `LLM hallucination 감지: recommended_ids=${JSON.stringify(rec.recommended_ids)} 중 ${JSON.stringify(unmatched)} 가 candidate 밖`,
    )
  }
  return rec
}

/**
 * SSE 라인 파서. `event: <name>\ndata: <json>\n\n` 묶음 단위 추출.
 * Lane B 의 wire format: named event ('start' | 'raw' | 'warn' | 'final' | 'error' | 'done')
 * 끝나지 않은 마지막 청크는 buffer 로 돌려준다.
 */
type SseEvent = { event: string; data: unknown }
function parseSseChunks(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = []
  let rest = buffer
  // SSE 이벤트 구분자 = `\n\n`
  let sep = rest.indexOf('\n\n')
  while (sep !== -1) {
    const raw = rest.slice(0, sep)
    rest = rest.slice(sep + 2)
    let eventName = 'message'
    let dataPayload: string | null = null
    for (const line of raw.split('\n')) {
      if (line.startsWith('event: ')) {
        eventName = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        dataPayload = line.slice(6).trim()
      }
    }
    if (dataPayload === null || dataPayload.length === 0) {
      sep = rest.indexOf('\n\n')
      continue
    }
    try {
      events.push({ event: eventName, data: JSON.parse(dataPayload) })
    } catch {
      // malformed — skip silently. fail-fast 는 final 검증에서 처리
    }
    sep = rest.indexOf('\n\n')
  }
  return { events, rest }
}

export async function* streamRecommendation(
  input: OrchestratorInput,
): AsyncGenerator<{ chunk: string; final?: LLMRecommendation }> {
  // ── USE_MOCKS path: fixture 즉시 final 반환 (Lane B 미완성 상태에서도 빌드 사이클 돈다) ──
  if (USE_MOCKS) {
    const validated = validateAgainstCandidates(MOCK_LLM_FIXTURE, input.candidatePois)
    yield { chunk: '', final: validated }
    return
  }

  // ── Real fetch path: server `/api/llm` SSE stream ──
  const res = await fetch(`${apiBaseUrl}/api/llm`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`)
  if (!res.body) throw new Error('LLM 응답 body 없음')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finalRec: LLMRecommendation | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseChunks(buffer)
    buffer = rest
    for (const ev of events) {
      // Lane B wire format: named event 'final' 의 data 가 LLMRecommendation 본체
      if (ev.event === 'final' && ev.data && typeof ev.data === 'object') {
        const f = ev.data as Partial<LLMRecommendation>
        if (Array.isArray(f.recommended_ids) && typeof f.note === 'string') {
          finalRec = { recommended_ids: f.recommended_ids, note: f.note }
        }
      } else if (ev.event === 'message' && ev.data && typeof ev.data === 'object') {
        // 미명명 이벤트의 chunk 형태도 호환 (legacy)
        const obj = ev.data as { chunk?: unknown }
        if (typeof obj.chunk === 'string' && obj.chunk.length > 0) {
          yield { chunk: obj.chunk }
        }
      }
    }
  }

  if (!finalRec) {
    throw new Error('LLM stream 끝났지만 final payload 없음')
  }
  const validated = validateAgainstCandidates(finalRec, input.candidatePois)
  yield { chunk: '', final: validated }
}

// ---------------------------------------------------------------------------
// D21 — SCENARIO 02 도시 추천 (LLMCityRecommendation)
// ---------------------------------------------------------------------------
/**
 * SCENARIO 02 의 4 도시 추천 streamer.
 *
 * 입력은 user 의 결 (tags 등) + 자유 발화. 후보 list 는 별도 X — D2 hallucination 가드는
 * "한국 도시명" 자연어 응답이라 id-set 검증 패턴이 적용되지 않는다 (POI 추천과는 다른 결).
 * 대신 shape 검증 (cities 배열 4개 권장, name/reason/match 키 존재) 만 수행.
 *
 * Wire format (USE_MOCKS=false 시 server `/api/llm/cities` 응답):
 *   SSE 표준 — `event: start → raw → final → done` (POI 와 동일 패턴, Lane B sync)
 *   final.data = LLMCityRecommendation
 *
 * USE_MOCKS=true 또는 Lane B 미완성 (404/5xx) 시:
 *   fixture 즉시 final 반환 (design-preview SCENARIO 02 의 4 도시 그대로)
 */

const CITY_FALLBACK_FIXTURE: LLMCityRecommendation = {
  cities: [
    { name: '강릉', reason: '혼자 바다 보는 시간 · 카페 거리', match: 94 },
    { name: '통영', reason: '골목과 빵, 작은 항구', match: 89 },
    { name: '제주 남부', reason: '오름을 천천히', match: 87 },
    { name: '거제', reason: '조용한 어촌 · 풍경 위주', match: 82 },
  ],
  note: '비슷한 결, 다른 결로 섞었어요',
}

export interface CityOrchestratorInput {
  userStyle: UserStyle
  utterance: string
}

/** SSE event.data 가 LLMCityRecommendation shape 인지 검증. */
function validateCityShape(raw: unknown): LLMCityRecommendation | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Partial<LLMCityRecommendation>
  if (!Array.isArray(f.cities) || f.cities.length === 0) return null
  if (typeof f.note !== 'string') return null
  const valid = f.cities.every(
    (c): c is CityCandidate =>
      !!c &&
      typeof (c as CityCandidate).name === 'string' &&
      typeof (c as CityCandidate).reason === 'string' &&
      typeof (c as CityCandidate).match === 'number',
  )
  if (!valid) return null
  return { cities: f.cities, note: f.note }
}

export async function* streamCityRecommendation(
  input: CityOrchestratorInput,
): AsyncGenerator<{ chunk: string; final?: LLMCityRecommendation }> {
  // ── USE_MOCKS path: fixture 즉시 final 반환 ──
  if (USE_MOCKS) {
    yield { chunk: '', final: CITY_FALLBACK_FIXTURE }
    return
  }

  // ── Real fetch path: server `/api/llm/cities` SSE stream ──
  // Lane B 가 endpoint 추가하기 전엔 404 → caller 가 catch 해서 fallback voice 표시
  const res = await fetch(`${apiBaseUrl}/api/llm/cities`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Cities LLM HTTP ${res.status}`)
  if (!res.body) throw new Error('Cities LLM 응답 body 없음')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finalRec: LLMCityRecommendation | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseChunks(buffer)
    buffer = rest
    for (const ev of events) {
      if (ev.event === 'final') {
        const validated = validateCityShape(ev.data)
        if (validated) {
          finalRec = validated
        }
      }
    }
  }

  if (!finalRec) throw new Error('Cities LLM stream 끝났지만 final payload 없음')
  yield { chunk: '', final: finalRec }
}

// ---------------------------------------------------------------------------
// D29 — SCENARIO 03 POI 큐레이션 (LLMTripPoiList)
// ---------------------------------------------------------------------------
/**
 * SCENARIO 03 의 POI 큐레이션 streamer.
 *
 * 입력 = 도시 + user 의 결 + 싫어요 history + 자유 발화 (재호출 시 "더 한적한 카페만" 등).
 * 출력 = LLM 이 제시한 전체 pois (D29 의 "12 / 23" 의 23). Lane B 가 도시 in-area Kakao POI
 * pool 을 사전 제공 → LLM 이 거기서 골라낸 결과를 받는다. D2 정신 적용 — id whitelist 검증.
 *
 * Wire format (USE_MOCKS=false 시 server `/api/llm/trip-pois` 응답):
 *   SSE 표준 — `event: start → raw → final → done` (cities 와 동일 패턴)
 *   final.data = LLMTripPoiList
 *
 * USE_MOCKS=true 또는 Lane B 미완성 (404/5xx) 시:
 *   fixture 즉시 final 반환 (강릉 8 POI 가정, design-preview SCENARIO 03 톤 일치)
 */

const TRIP_POI_FALLBACK_FIXTURE: LLMTripPoiList = {
  pois: [
    {
      id: 'fallback_001',
      name: '안목 해변 커피거리',
      category: '카페 · 오션뷰',
      reason: '바다 보면서 진한 커피 한 잔',
      match: 95,
    },
    {
      id: 'fallback_002',
      name: '정동진 일출',
      category: '새벽 · 5:42 일출',
      reason: '하루를 길게 시작하는 결',
      match: 92,
    },
    {
      id: 'fallback_003',
      name: '사천진리 책방',
      category: '독립서점 · 조용',
      reason: '책 한 권 골라서 차 한 잔',
      match: 88,
    },
    {
      id: 'fallback_004',
      name: '경포대',
      category: '호수 산책',
      reason: '천천히 걷기 좋아요',
      match: 84,
    },
    {
      id: 'fallback_005',
      name: '강릉 중앙시장',
      category: '먹거리 · 늦은 점심',
      reason: '국밥 한 그릇, 시장 구경',
      match: 82,
    },
  ],
  note: '이 안에서 가볼 만한 곳들이에요',
}

export interface TripPoiOrchestratorInput {
  city: string
  userStyle: UserStyle
  dislikedIds?: string[]
  prompt?: string
}

/** SSE event.data 가 LLMTripPoiList shape 인지 검증 (D2 정신). */
function validateTripPoiShape(raw: unknown): LLMTripPoiList | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Partial<LLMTripPoiList>
  if (!Array.isArray(f.pois) || f.pois.length === 0) return null
  if (typeof f.note !== 'string') return null
  const valid = f.pois.every(
    (p): p is TripPoiCandidate =>
      !!p &&
      typeof (p as TripPoiCandidate).id === 'string' &&
      typeof (p as TripPoiCandidate).name === 'string' &&
      typeof (p as TripPoiCandidate).category === 'string' &&
      typeof (p as TripPoiCandidate).reason === 'string' &&
      typeof (p as TripPoiCandidate).match === 'number',
  )
  if (!valid) return null
  return { pois: f.pois, note: f.note }
}

export async function* streamTripPois(
  input: TripPoiOrchestratorInput,
): AsyncGenerator<{ chunk: string; final?: LLMTripPoiList }> {
  // ── USE_MOCKS path: fixture 즉시 final 반환 ──
  if (USE_MOCKS) {
    yield { chunk: '', final: TRIP_POI_FALLBACK_FIXTURE }
    return
  }

  // ── Real fetch path: server `/api/llm/trip-pois` SSE stream ──
  // Lane B 가 endpoint 추가하기 전엔 404 → caller 가 catch 해서 fallback voice 표시
  const res = await fetch(`${apiBaseUrl}/api/llm/trip-pois`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`TripPois LLM HTTP ${res.status}`)
  if (!res.body) throw new Error('TripPois LLM 응답 body 없음')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finalRec: LLMTripPoiList | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseChunks(buffer)
    buffer = rest
    for (const ev of events) {
      if (ev.event === 'final') {
        const validated = validateTripPoiShape(ev.data)
        if (validated) {
          finalRec = validated
        }
      }
    }
  }

  if (!finalRec) throw new Error('TripPois LLM stream 끝났지만 final payload 없음')
  yield { chunk: '', final: finalRec }
}

// ---------------------------------------------------------------------------
// D29 — SCENARIO 04 동선 선택 (LLMRouteList)
// ---------------------------------------------------------------------------
/**
 * SCENARIO 04 의 동선 3 갈래 streamer.
 *
 * 입력 = 도시 + ♥ 한 POI id list (≥3) + user 의 결.
 * 출력 = LLM 이 likedPoiIds 만 stops 로 묶어서 짠 3 갈래 동선 (Plan A/B/C — 정확히 3개).
 * D2 정신 적용 — stops 의 poi_id 는 모두 likedPoiIds set 안에 있어야.
 *
 * Wire format (USE_MOCKS=false 시 server `/api/llm/routes` 응답):
 *   SSE 표준 — `event: start → raw → final → done` (trip-pois 와 동일 패턴)
 *   final.data = LLMRouteList
 *
 * USE_MOCKS=true 또는 Lane B 미완성 (404/5xx) 시:
 *   fixture 즉시 final 반환 (강릉 가정, design-preview SCENARIO 04 톤 일치)
 */

const ROUTES_FALLBACK_FIXTURE: LLMRouteList =
  require('../__mocks__/api/llm-routes.json') as LLMRouteList

export interface RoutesOrchestratorInput {
  city: string
  likedPoiIds: string[]
  userStyle: UserStyle
}

/** SSE event.data 가 LLMRouteList shape 인지 검증 (D2 정신). */
function validateRoutesShape(raw: unknown): LLMRouteList | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Partial<LLMRouteList>
  if (!Array.isArray(f.routes) || f.routes.length !== 3) return null
  if (typeof f.note !== 'string') return null
  const lettersOk = new Set(['A', 'B', 'C'])
  const valid = f.routes.every((r): r is LLMRoute => {
    if (!r || typeof r !== 'object') return false
    const rr = r as Partial<LLMRoute>
    if (typeof rr.letter !== 'string' || !lettersOk.has(rr.letter)) return false
    if (typeof rr.name !== 'string' || typeof rr.reason !== 'string') return false
    if (typeof rr.travelMin !== 'number' || typeof rr.moodStars !== 'number') return false
    if (!Array.isArray(rr.stops)) return false
    return rr.stops.every(
      (s): s is LLMRouteStop =>
        !!s &&
        typeof (s as LLMRouteStop).poi_id === 'string' &&
        typeof (s as LLMRouteStop).order === 'number',
    )
  })
  if (!valid) return null
  return { routes: f.routes, note: f.note }
}

export async function* streamRoutes(
  input: RoutesOrchestratorInput,
): AsyncGenerator<{ chunk: string; final?: LLMRouteList }> {
  // ── USE_MOCKS path: fixture 즉시 final 반환 ──
  if (USE_MOCKS) {
    yield { chunk: '', final: ROUTES_FALLBACK_FIXTURE }
    return
  }

  // ── Real fetch path: server `/api/llm/routes` SSE stream ──
  const res = await fetch(`${apiBaseUrl}/api/llm/routes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Routes LLM HTTP ${res.status}`)
  if (!res.body) throw new Error('Routes LLM 응답 body 없음')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finalRec: LLMRouteList | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseChunks(buffer)
    buffer = rest
    for (const ev of events) {
      if (ev.event === 'final') {
        const validated = validateRoutesShape(ev.data)
        if (validated) {
          finalRec = validated
        }
      }
    }
  }

  if (!finalRec) throw new Error('Routes LLM stream 끝났지만 final payload 없음')
  yield { chunk: '', final: finalRec }
}

// ---------------------------------------------------------------------------
// D32 — SCENARIO 07-CHAT 채팅 대화 (LLMChatResponse)
// ---------------------------------------------------------------------------
/**
 * Phase 5a · 채팅 모드 default streamer.
 *
 * 입력 = user 의 결 + 대화 history (최근 50턴 cap, Lane B 단에서도 동일 cap) +
 *       이번 사용자 발화 + 선택적 tripContext (city / startDate / endDate / planning_step).
 * 출력 = 친구 톤 응답 한 문장 (LLMChatResponse.response, 15-200자, 시그니처는 zod schema 와 일치).
 *
 * Wire format (USE_MOCKS=false 시 server `/api/llm/chat` 응답):
 *   SSE 표준 — `event: start → raw → final → done` (기존 POI/cities/routes 와 동일 패턴)
 *   final.data = LLMChatResponse
 *
 * USE_MOCKS=true:
 *   __mocks__/api/llm-chat.json 의 단일 LLMChatResponse 를 즉시 final 로 yield.
 *
 * 친구 톤 voice 인용은 design-preview SCENARIO 07-CHAT line 2422 의 인사 그대로.
 *
 * AsyncGenerator 시그니처 freeze (D12). body 만 구현.
 */

const CHAT_FALLBACK_FIXTURE: LLMChatResponse =
  require('../__mocks__/api/llm-chat.json') as LLMChatResponse

export interface ChatOrchestratorInput {
  userStyle: UserStyle
  history: Turn[]
  userMessage: string
  tripContext?: {
    city?: string
    startDate?: string
    endDate?: string
    planningStep?: 'dates' | 'pois' | 'routes' | 'on_trip'
  }
}

/** SSE event.data 가 LLMChatResponse shape 인지 검증 (D2 정신). */
function validateChatShape(raw: unknown): LLMChatResponse | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Partial<LLMChatResponse>
  if (typeof f.response !== 'string' || f.response.length < 2) return null
  return { response: f.response }
}

export async function* streamChat(
  input: ChatOrchestratorInput,
): AsyncGenerator<{ chunk: string; final?: LLMChatResponse }> {
  // ── USE_MOCKS path: fixture 즉시 final 반환 ──
  if (USE_MOCKS) {
    yield { chunk: '', final: CHAT_FALLBACK_FIXTURE }
    return
  }

  // ── Real fetch path: server `/api/llm/chat` SSE stream ──
  const res = await fetch(`${apiBaseUrl}/api/llm/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Chat LLM HTTP ${res.status}`)
  if (!res.body) throw new Error('Chat LLM 응답 body 없음')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finalRec: LLMChatResponse | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseChunks(buffer)
    buffer = rest
    for (const ev of events) {
      if (ev.event === 'final') {
        const validated = validateChatShape(ev.data)
        if (validated) {
          finalRec = validated
        }
      } else if (ev.event === 'raw' && ev.data && typeof ev.data === 'object') {
        // 옵셔널: streaming chunk yield (token 단위). Lane B 가 raw event 로
        // partial token 흘려보내면 caller 가 typing indicator 에 활용 가능.
        const obj = ev.data as { chunk?: unknown }
        if (typeof obj.chunk === 'string' && obj.chunk.length > 0) {
          yield { chunk: obj.chunk }
        }
      }
    }
  }

  if (!finalRec) throw new Error('Chat LLM stream 끝났지만 final payload 없음')
  yield { chunk: '', final: finalRec }
}

// ---------------------------------------------------------------------------
// D34 — SCENARIO 08 대화로 동선 변경 (Intent + RouteUpdate)
// ---------------------------------------------------------------------------
/**
 * Phase 5b · 채팅 안에서 사용자 발화 → intent 분기 → 동선 재계산.
 *
 * 두 단계로 흐름이 나뉜다:
 *  1. streamIntent — 사용자 발화 → ChatIntent ('add_poi' | 'remove_poi' | ...)
 *  2. intent === 'add_poi' (등 동선 변경) → streamRouteUpdate 로 갱신 LLMRoute
 *
 * Wire format (USE_MOCKS=false 시):
 *   - POST /api/llm/intent       → SSE final.data = LLMIntentExtraction
 *   - POST /api/llm/route-update → SSE final.data = LLMRouteUpdate
 *
 * USE_MOCKS=true 또는 Lane B 미완성 (404/5xx) 시:
 *   fixture (__mocks__/api/llm-intent.json · llm-route-update.json) 즉시 final 반환.
 *
 * 친구 톤 voice 인용은 design-preview SCENARIO 08 line 2489-2516 그대로.
 */

const INTENT_FALLBACK_FIXTURE: LLMIntentExtraction =
  require('../__mocks__/api/llm-intent.json') as LLMIntentExtraction

const ROUTE_UPDATE_FALLBACK_FIXTURE: LLMRouteUpdate =
  require('../__mocks__/api/llm-route-update.json') as LLMRouteUpdate

export interface IntentOrchestratorInput {
  userMessage: string
  tripContext?: {
    city?: string
    startDate?: string
    endDate?: string
    planningStep?: 'dates' | 'pois' | 'routes' | 'on_trip'
  }
}

/** SSE event.data 가 LLMIntentExtraction shape 인지 검증 (D2 정신). */
function validateIntentShape(raw: unknown): LLMIntentExtraction | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Partial<LLMIntentExtraction>
  if (typeof f.intent !== 'string') return null
  const allowed: ChatIntent[] = ['add_poi', 'remove_poi', 'change_day', 'continue', 'show_map']
  if (!allowed.includes(f.intent as ChatIntent)) return null
  const result: LLMIntentExtraction = { intent: f.intent as ChatIntent }
  if (typeof f.poiName === 'string') result.poiName = f.poiName
  if (typeof f.removeName === 'string') result.removeName = f.removeName
  if (typeof f.targetDay === 'number') result.targetDay = f.targetDay
  return result
}

export async function* streamIntent(
  input: IntentOrchestratorInput,
): AsyncGenerator<{ chunk: string; final?: LLMIntentExtraction }> {
  // ── USE_MOCKS path: fixture 즉시 final 반환 ──
  if (USE_MOCKS) {
    yield { chunk: '', final: INTENT_FALLBACK_FIXTURE }
    return
  }

  // ── Real fetch path: server `/api/llm/intent` SSE stream ──
  const res = await fetch(`${apiBaseUrl}/api/llm/intent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Intent LLM HTTP ${res.status}`)
  if (!res.body) throw new Error('Intent LLM 응답 body 없음')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finalRec: LLMIntentExtraction | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseChunks(buffer)
    buffer = rest
    for (const ev of events) {
      if (ev.event === 'final') {
        const validated = validateIntentShape(ev.data)
        if (validated) {
          finalRec = validated
        }
      }
    }
  }

  if (!finalRec) throw new Error('Intent LLM stream 끝났지만 final payload 없음')
  yield { chunk: '', final: finalRec }
}

export interface RouteUpdateOrchestratorInput {
  currentRoute: LLMRoute
  addRequest: string // 사용자 발화 또는 추출된 POI 이름 ("정동진")
  city: string
  userStyle: UserStyle
}

/** SSE event.data 가 LLMRouteUpdate shape 인지 검증 (D2 정신). */
function validateRouteUpdateShape(raw: unknown): LLMRouteUpdate | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Partial<LLMRouteUpdate>
  if (typeof f.note !== 'string') return null
  if (!f.route || typeof f.route !== 'object') return null
  const r = f.route as Partial<LLMRoute>
  const lettersOk = new Set(['A', 'B', 'C'])
  if (typeof r.letter !== 'string' || !lettersOk.has(r.letter)) return null
  if (typeof r.name !== 'string' || typeof r.reason !== 'string') return null
  if (typeof r.travelMin !== 'number' || typeof r.moodStars !== 'number') return null
  if (!Array.isArray(r.stops)) return null
  const stopsOk = r.stops.every(
    (s): s is LLMRouteStop =>
      !!s &&
      typeof (s as LLMRouteStop).poi_id === 'string' &&
      typeof (s as LLMRouteStop).order === 'number',
  )
  if (!stopsOk) return null
  const result: LLMRouteUpdate = { route: f.route as LLMRoute, note: f.note }
  if (typeof f.addedStopName === 'string') result.addedStopName = f.addedStopName
  return result
}

export async function* streamRouteUpdate(
  input: RouteUpdateOrchestratorInput,
): AsyncGenerator<{ chunk: string; final?: LLMRouteUpdate }> {
  // ── USE_MOCKS path: fixture 즉시 final 반환 ──
  if (USE_MOCKS) {
    yield { chunk: '', final: ROUTE_UPDATE_FALLBACK_FIXTURE }
    return
  }

  // ── Real fetch path: server `/api/llm/route-update` SSE stream ──
  const res = await fetch(`${apiBaseUrl}/api/llm/route-update`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`RouteUpdate LLM HTTP ${res.status}`)
  if (!res.body) throw new Error('RouteUpdate LLM 응답 body 없음')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finalRec: LLMRouteUpdate | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseChunks(buffer)
    buffer = rest
    for (const ev of events) {
      if (ev.event === 'final') {
        const validated = validateRouteUpdateShape(ev.data)
        if (validated) {
          finalRec = validated
        }
      }
    }
  }

  if (!finalRec) throw new Error('RouteUpdate LLM stream 끝났지만 final payload 없음')
  yield { chunk: '', final: finalRec }
}
