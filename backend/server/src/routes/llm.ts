// Phase 3 Day 7 — Claude CLI spawn + D2 recommended_ids JSON 강제
// POST /api/llm
//   body:  { userStyle, utterance, candidatePois }
//   →      SSE stream of LLMRecommendation (D2 strict)
//
// D9-b: Bun.spawn(['claude', '-p', '--output-format=stream-json']) — Anthropic SDK 직접 호출 X
//       호스트 ~/.claude bind mount 로 OAuth 인증 (ANTHROPIC_API_KEY 사용 X)
// D2: candidatePois 의 id 만 응답 가능. recommended_ids ⊄ candidatePois.id → hallucination → fallback
// D12: zod 미설치 → 수동 validate.

import type { KakaoPOI, LLMRecommendation, UserStyle } from '@trip/types'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'

// Phase 3 Day 7 응답 시그니처: SSE stream of LLMRecommendation (D2 strict)
export type LLMResponse = LLMRecommendation

interface LLMRequestBody {
  userStyle: UserStyle
  utterance: string
  candidatePois: KakaoPOI[]
}

// ---------------------------------------------------------------------------
// Body validate (zod 미설치 → 수동)
// ---------------------------------------------------------------------------
function validateBody(raw: unknown): LLMRequestBody | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'body must be object' }
  const b = raw as Record<string, unknown>

  const us = b.userStyle
  if (!us || typeof us !== 'object') return { error: 'userStyle required' }
  const usObj = us as Record<string, unknown>
  if (
    !Array.isArray(usObj.tags) ||
    !Array.isArray(usObj.likedPoiIds) ||
    !Array.isArray(usObj.dislikedPoiIds)
  )
    return { error: 'userStyle.tags/likedPoiIds/dislikedPoiIds must be arrays' }

  if (typeof b.utterance !== 'string') return { error: 'utterance must be string' }

  if (!Array.isArray(b.candidatePois)) return { error: 'candidatePois must be array' }
  for (const p of b.candidatePois) {
    if (!p || typeof p !== 'object') return { error: 'candidatePois[i] must be object' }
    const po = p as Record<string, unknown>
    if (typeof po.id !== 'string' || typeof po.name !== 'string')
      return { error: 'candidatePois[i].id/name required' }
  }

  return {
    userStyle: {
      tags: usObj.tags as string[],
      likedPoiIds: usObj.likedPoiIds as string[],
      dislikedPoiIds: usObj.dislikedPoiIds as string[],
    },
    utterance: b.utterance,
    candidatePois: b.candidatePois as KakaoPOI[],
  }
}

// ---------------------------------------------------------------------------
// System prompt (D2: 후보 id 명시 + JSON schema 강제)
// ---------------------------------------------------------------------------
function buildPrompt(req: LLMRequestBody): string {
  const candidateLines = req.candidatePois
    .map((p) => `- id="${p.id}" | ${p.name} | ${p.address} | ${p.category}`)
    .join('\n')
  const tagsLine = req.userStyle.tags.length > 0 ? req.userStyle.tags.join(', ') : '(없음)'
  const likedLine =
    req.userStyle.likedPoiIds.length > 0 ? req.userStyle.likedPoiIds.join(', ') : '(없음)'
  const dislikedLine =
    req.userStyle.dislikedPoiIds.length > 0 ? req.userStyle.dislikedPoiIds.join(', ') : '(없음)'

  return `당신은 "동행" 의 여행 컴패니언입니다. 친구가 옆에서 같이 짜주는 느낌으로, 간결하고 따뜻한 한국어로 한 줄 추천하세요.

[사용자 발화]
"${req.utterance}"

[사용자 취향]
- tags: ${tagsLine}
- liked: ${likedLine}
- disliked: ${dislikedLine}

[후보 장소 — 이 id 중에서만 골라야 합니다]
${candidateLines || '(후보 없음)'}

[응답 규칙 — 반드시 준수]
1. JSON 객체 하나만 응답. 다른 텍스트 금지.
2. schema: { "recommended_ids": string[], "note": string }
3. recommended_ids 는 위 후보의 id 중에서만 고를 것. 새 id 생성 금지.
4. recommended_ids 최대 3개. 후보가 없으면 빈 배열.
5. note 는 친구 톤 한국어 한 문장 (60자 내외).`
}

// ---------------------------------------------------------------------------
// JSON 추출 — Claude CLI stream-json 출력 또는 일반 텍스트에서
// ---------------------------------------------------------------------------
function extractJSON(text: string): LLMRecommendation | null {
  // 가장 마지막 JSON object 찾기
  const matches = text.match(/\{[\s\S]*?"recommended_ids"[\s\S]*?\}/g)
  if (!matches || matches.length === 0) return null
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(matches[i]) as Partial<LLMRecommendation>
      if (
        Array.isArray(parsed.recommended_ids) &&
        parsed.recommended_ids.every((id) => typeof id === 'string') &&
        typeof parsed.note === 'string'
      ) {
        return { recommended_ids: parsed.recommended_ids, note: parsed.note }
      }
    } catch {
      // continue
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// D2 검증: recommended_ids ⊂ candidatePois.id
// ---------------------------------------------------------------------------
function validateAgainstCandidates(
  rec: LLMRecommendation,
  candidates: KakaoPOI[],
): { ok: true } | { ok: false; invalidIds: string[] } {
  const allowed = new Set(candidates.map((p) => p.id))
  const invalid = rec.recommended_ids.filter((id) => !allowed.has(id))
  if (invalid.length > 0) return { ok: false, invalidIds: invalid }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Claude CLI 가용성 check
// ---------------------------------------------------------------------------
let claudeAvailable: boolean | null = null
async function isClaudeAvailable(): Promise<boolean> {
  if (claudeAvailable !== null) return claudeAvailable
  try {
    // Bun.spawn 동기 즉시 — exit code 만 확인
    const proc = Bun.spawn(['claude', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const code = await proc.exited
    claudeAvailable = code === 0
  } catch {
    claudeAvailable = false
  }
  return claudeAvailable
}

// ---------------------------------------------------------------------------
// Claude CLI spawn → JSON 응답 수집
// ---------------------------------------------------------------------------
async function callClaude(prompt: string): Promise<string> {
  // -p: 단발 prompt. stdout 으로 응답 텍스트만 받기 위해 --output-format=text
  const proc = Bun.spawn(['claude', '-p', '--output-format=text', prompt], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const text = await new Response(proc.stdout).text()
  await proc.exited
  return text
}

// ---------------------------------------------------------------------------
// Mock fallback (Claude CLI 부재 시 — Phase 3 검증 용도)
// ---------------------------------------------------------------------------
function mockRecommendation(req: LLMRequestBody): LLMRecommendation {
  if (req.candidatePois.length === 0) {
    return { recommended_ids: [], note: '지금 주변엔 마땅한 곳이 없네요. 조금만 더 걸어볼까요?' }
  }
  const top = req.candidatePois.slice(0, 3).map((p) => p.id)
  const firstName = req.candidatePois[0].name
  return {
    recommended_ids: top,
    note: `${firstName} 어때요? 지금 분위기랑 잘 맞을 것 같아요.`,
  }
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------
const llmRoutes = new Hono()

llmRoutes.post('/', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }
  const validated = validateBody(raw)
  if ('error' in validated) {
    return c.json({ error: validated.error }, 400)
  }
  const req = validated

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: 'start',
      data: JSON.stringify({ candidates: req.candidatePois.length }),
    })

    const useClaude = await isClaudeAvailable()
    let finalRec: LLMRecommendation
    let hallucinationDetected = false

    if (useClaude) {
      try {
        const prompt = buildPrompt(req)
        const text = await callClaude(prompt)
        await stream.writeSSE({ event: 'raw', data: JSON.stringify({ length: text.length }) })
        const parsed = extractJSON(text)
        if (!parsed) {
          // parse fail → fallback
          finalRec = mockRecommendation(req)
          await stream.writeSSE({
            event: 'warn',
            data: JSON.stringify({ reason: 'parse_failed' }),
          })
        } else {
          const v = validateAgainstCandidates(parsed, req.candidatePois)
          if (!v.ok) {
            hallucinationDetected = true
            console.warn('[llm] D2 hallucination', {
              invalidIds: v.invalidIds,
              candidateIds: req.candidatePois.map((p) => p.id),
            })
            await stream.writeSSE({
              event: 'error',
              data: JSON.stringify({ reason: 'hallucination', invalidIds: v.invalidIds }),
            })
            // D2: 카드 표시 X → 빈 recommended_ids + 안전 note
            finalRec = {
              recommended_ids: [],
              note: '음, 잠깐만요. 지금 후보를 다시 살피고 있어요.',
            }
          } else {
            finalRec = parsed
          }
        }
      } catch (err) {
        console.error('[llm] claude spawn error', err)
        finalRec = mockRecommendation(req)
        await stream.writeSSE({
          event: 'warn',
          data: JSON.stringify({ reason: 'claude_spawn_failed' }),
        })
      }
    } else {
      // Claude CLI 없음 — mock fallback (Phase 3 dev 환경에서 동작 검증)
      await stream.writeSSE({
        event: 'warn',
        data: JSON.stringify({ reason: 'claude_cli_unavailable', fallback: 'mock' }),
      })
      finalRec = mockRecommendation(req)
    }

    await stream.writeSSE({
      event: 'final',
      data: JSON.stringify(finalRec),
    })
    await stream.writeSSE({
      event: 'done',
      data: JSON.stringify({ hallucinationDetected }),
    })
  })
})

export { llmRoutes }
