import type { KakaoPOI, LLMRecommendation, UserStyle } from '@trip/types'

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
 * SSE 라인 파서. `data: <json>\n\n` 묶음에서 JSON payload 만 추출.
 * 끝나지 않은 마지막 청크는 buffer 로 돌려준다.
 */
function parseSseChunks(buffer: string): { events: unknown[]; rest: string } {
  const events: unknown[] = []
  let rest = buffer
  // SSE 이벤트 구분자 = `\n\n`
  let sep = rest.indexOf('\n\n')
  while (sep !== -1) {
    const raw = rest.slice(0, sep)
    rest = rest.slice(sep + 2)
    // `data: ` 로 시작하는 줄만 본다 (event/id 등은 무시)
    for (const line of raw.split('\n')) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim()
        if (payload.length === 0) continue
        try {
          events.push(JSON.parse(payload))
        } catch {
          // malformed — skip silently. fail-fast 는 final 검증에서 처리
        }
      }
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
      if (typeof ev !== 'object' || ev === null) continue
      const obj = ev as { chunk?: unknown; final?: unknown }
      if (typeof obj.chunk === 'string' && obj.chunk.length > 0) {
        yield { chunk: obj.chunk }
      }
      if (obj.final && typeof obj.final === 'object') {
        const f = obj.final as Partial<LLMRecommendation>
        if (Array.isArray(f.recommended_ids) && typeof f.note === 'string') {
          finalRec = { recommended_ids: f.recommended_ids, note: f.note }
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
