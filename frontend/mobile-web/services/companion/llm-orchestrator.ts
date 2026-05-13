import type {
  CityCandidate,
  KakaoPOI,
  LLMCityRecommendation,
  LLMRecommendation,
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
