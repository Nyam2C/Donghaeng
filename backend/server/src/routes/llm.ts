// Phase 3 Day 7 — Claude CLI spawn + D2 recommended_ids JSON 강제
// POST /api/llm
//   body:  { userStyle, utterance, candidatePois }
//   →      SSE stream of LLMRecommendation (D2 strict)
//
// D9-b: Bun.spawn(['claude', '-p', '--output-format=stream-json']) — Anthropic SDK 직접 호출 X
//       호스트 ~/.claude bind mount 로 OAuth 인증 (ANTHROPIC_API_KEY 사용 X)
// D2: candidatePois 의 id 만 응답 가능. recommended_ids ⊄ candidatePois.id → hallucination → fallback
// D12: zod 미설치 → 수동 validate.

import type {
  CityCandidate,
  KakaoPOI,
  LLMCityRecommendation,
  LLMRecommendation,
  UserStyle,
} from '@trip/types'
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

// ===========================================================================
// D21 — POST /api/llm/cities — AI 도시 추천 (SCENARIO 02)
// ===========================================================================
// body:  { userStyle, utterance }
// →      SSE stream of LLMCityRecommendation
//
// D2 정신 적용: cities[].name 은 한국 실재 도시 whitelist 안에서만 허용.
// fail → fallback (whitelist 에서 결 매칭 4개) + hallucinationDetected=true.

interface CityRequestBody {
  userStyle: UserStyle
  utterance: string
}

// 한국 도시 whitelist — 광역시도 17개 + 동행 여행 맥락 자주 등장하는 시군구
// (D21: hallucination 방지 정합. 실재하지 않는 도시명을 LLM 이 만들어내면 reject.)
const CITY_WHITELIST: readonly string[] = [
  // 광역시도 17
  '서울',
  '부산',
  '대구',
  '인천',
  '광주',
  '대전',
  '울산',
  '세종',
  '경기',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
  // 강원
  '강릉',
  '속초',
  '양양',
  '평창',
  '춘천',
  '원주',
  '동해',
  '삼척',
  '정선',
  '횡성',
  '홍천',
  '인제',
  '고성',
  // 경상
  '경주',
  '안동',
  '포항',
  '울진',
  '영주',
  '문경',
  '상주',
  '거제',
  '통영',
  '남해',
  '하동',
  '진주',
  '창원',
  '김해',
  '양산',
  '밀양',
  // 전라
  '전주',
  '여수',
  '순천',
  '목포',
  '담양',
  '광양',
  '곡성',
  '구례',
  '군산',
  '익산',
  '남원',
  '고창',
  '부안',
  '완도',
  '진도',
  '보성',
  // 충청
  '단양',
  '제천',
  '충주',
  '청주',
  '공주',
  '부여',
  '서산',
  '태안',
  '보령',
  '논산',
  '천안',
  '아산',
  // 경기/인천 주요
  '가평',
  '양평',
  '파주',
  '강화',
  '안성',
  '평택',
  '수원',
  '용인',
  '광주시',
  '여주',
  '포천',
  // 제주
  '제주 남부',
  '제주 동부',
  '제주 서부',
  '제주 북부',
  '서귀포',
  '제주시',
  // 기타 여행 빈출
  '울릉',
  '독도',
] as const

const CITY_SET = new Set<string>(CITY_WHITELIST)

// ---------------------------------------------------------------------------
// Body validate
// ---------------------------------------------------------------------------
function validateCityBody(raw: unknown): CityRequestBody | { error: string } {
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

  return {
    userStyle: {
      tags: usObj.tags as string[],
      likedPoiIds: usObj.likedPoiIds as string[],
      dislikedPoiIds: usObj.dislikedPoiIds as string[],
    },
    utterance: b.utterance,
  }
}

// ---------------------------------------------------------------------------
// System prompt — 도시 추천용 (whitelist 안내 + JSON schema 강제)
// ---------------------------------------------------------------------------
function buildCityPrompt(req: CityRequestBody): string {
  const tagsLine = req.userStyle.tags.length > 0 ? req.userStyle.tags.join(', ') : '(없음)'
  const utterance = req.utterance.trim().length > 0 ? req.utterance : '(별도 발화 없음)'
  // whitelist 를 통째로 박지 않고 hint 수준의 예시만 제공 (toks 절감)
  const hintCities =
    '강릉, 통영, 제주 남부, 거제, 부산, 경주, 안동, 전주, 여수, 순천, 속초, 양양, 가평, 춘천, 평창, 단양, 영주, 안성, 평택, 군산, 익산'

  return `당신은 "동행" 의 여행 컴패니언입니다. 친구가 옆에서 같이 짜주는 느낌으로, 사용자의 결을 읽고 어울리는 한국 국내 도시를 골라주세요.

[사용자 결 (태그)]
${tagsLine}

[추가 발화]
"${utterance}"

[응답 규칙 — 반드시 준수]
1. JSON 객체 하나만 응답. 다른 텍스트 금지.
2. schema: { "cities": [{ "name": string, "reason": string, "match": number }], "note": string }
3. cities 는 정확히 4개. 비슷한 결 2개 + 다른 결 2개로 섞어주세요.
4. name 은 한국의 실재 도시명만. 예시: ${hintCities}.
5. 새 도시명 생성 금지. 광역시도 또는 시군구 단위. 제주는 "제주 남부" / "제주 동부" 같은 권역 허용.
6. reason 은 친구 톤 12-25자 한국어 (예: "조용한 새벽 바다가 좋아요").
7. match 는 0-100 정수, 사용자 결과 도시 분위기의 매칭도.
8. note 는 친구 톤 한 문장 (40자 내외). 예: "비슷한 결, 다른 결로 섞었어요."`
}

// ---------------------------------------------------------------------------
// JSON 추출 — Claude CLI 응답 텍스트에서 city 추천 JSON 찾기
// (cities 가 nested array of objects 라 non-greedy regex 가 안 됨 → brace counter)
// ---------------------------------------------------------------------------
function extractBalancedObjects(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = -1
  let inStr = false
  let esc = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (esc) {
      esc = false
      continue
    }
    if (inStr) {
      if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') {
      inStr = true
      continue
    }
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        out.push(text.slice(start, i + 1))
        start = -1
      }
    }
  }
  return out
}

function extractCityJSON(text: string): LLMCityRecommendation | null {
  const matches = extractBalancedObjects(text).filter((s) => s.includes('"cities"'))
  if (matches.length === 0) return null
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(matches[i]) as Partial<LLMCityRecommendation>
      if (!Array.isArray(parsed.cities)) continue
      const cities: CityCandidate[] = []
      let ok = true
      for (const c of parsed.cities) {
        if (
          !c ||
          typeof c !== 'object' ||
          typeof (c as CityCandidate).name !== 'string' ||
          typeof (c as CityCandidate).reason !== 'string' ||
          typeof (c as CityCandidate).match !== 'number'
        ) {
          ok = false
          break
        }
        const cc = c as CityCandidate
        // LLM 이 0~1 또는 0~100 둘 다 줄 수 있음 → 0~1 이면 100 배 정규화
        const m = cc.match <= 1 ? cc.match * 100 : cc.match
        cities.push({
          name: cc.name,
          reason: cc.reason,
          match: Math.max(0, Math.min(100, Math.round(m))),
        })
      }
      if (!ok) continue
      const note = typeof parsed.note === 'string' ? parsed.note : ''
      return { cities, note }
    } catch {
      // continue
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// D21 검증 — cities[].name 이 whitelist 안에 있고 length 가 정확히 4
// ---------------------------------------------------------------------------
function validateCitiesAgainstWhitelist(
  rec: LLMCityRecommendation,
): { ok: true } | { ok: false; invalid: string[]; reason: 'length' | 'whitelist' } {
  if (rec.cities.length !== 4) {
    return { ok: false, invalid: [], reason: 'length' }
  }
  const invalid = rec.cities.map((c) => c.name).filter((n) => !CITY_SET.has(n))
  if (invalid.length > 0) return { ok: false, invalid, reason: 'whitelist' }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Mock fallback — 결 태그 기반 간단 매칭 (claude CLI 부재 또는 검증 fail 시)
// ---------------------------------------------------------------------------
function mockCityRecommendation(req: CityRequestBody): LLMCityRecommendation {
  const tags = req.userStyle.tags.map((t) => t.toLowerCase())
  const has = (kw: string): boolean => tags.some((t) => t.includes(kw))

  // 결 → 후보 도시 풀
  const quiet = ['강릉', '통영', '제주 남부', '단양'] // 혼자/조용한
  const photo = ['경주', '안동', '전주', '여수'] // 사진/감성
  const sea = ['속초', '거제', '제주 남부', '여수'] // 바다
  const mountain = ['평창', '영월', '단양', '가평'] // 산/숲
  const food = ['전주', '통영', '부산', '춘천'] // 맛집
  const lively = ['부산', '서울', '제주시', '여수'] // 활기/사람

  let pool: string[]
  if (has('혼자') || has('조용')) pool = [...quiet, ...photo]
  else if (has('사진')) pool = [...photo, ...quiet]
  else if (has('바다')) pool = [...sea, ...quiet]
  else if (has('산') || has('숲')) pool = [...mountain, ...quiet]
  else if (has('맛') || has('먹')) pool = [...food, ...lively]
  else if (has('활기') || has('사람')) pool = [...lively, ...food]
  else pool = [...quiet, ...photo]

  // dedupe + 4 개
  const picked: string[] = []
  for (const c of pool) {
    if (!picked.includes(c) && CITY_SET.has(c)) picked.push(c)
    if (picked.length === 4) break
  }
  // 부족하면 default 채우기
  const defaults = ['강릉', '통영', '제주 남부', '거제']
  for (const c of defaults) {
    if (picked.length === 4) break
    if (!picked.includes(c)) picked.push(c)
  }

  const reasons: Record<string, string> = {
    강릉: '조용한 새벽 바다, 윤서님 결',
    통영: '바다와 골목, 천천히 걷기 좋아요',
    '제주 남부': '귤밭과 한적한 해안',
    거제: '섬 사이 조용한 풍경',
    부산: '활기와 바다가 같이 있어요',
    경주: '오래된 길, 사진 잘 나와요',
    안동: '한옥 골목, 차분한 결',
    전주: '한옥과 맛, 따뜻한 결',
    여수: '밤바다 빛, 사진 좋아요',
    속초: '바다와 산이 가까워요',
    평창: '숲과 고요한 공기',
    단양: '강과 절벽, 깊게 쉬어요',
    가평: '가까운 숲과 호수',
    춘천: '호수 도시, 가깝게 떠나요',
    영월: '강과 동굴, 조용한 결',
    서울: '익숙함 속 새 골목',
    제주시: '도시와 바다 사이',
  }

  const cities: CityCandidate[] = picked.map((name, i) => ({
    name,
    reason: reasons[name] ?? '결에 맞는 곳이에요',
    match: 92 - i * 5,
  }))

  return {
    cities,
    note: '비슷한 결, 다른 결로 섞었어요.',
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
llmRoutes.post('/cities', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400)
  }
  const validated = validateCityBody(raw)
  if ('error' in validated) {
    return c.json({ error: validated.error }, 400)
  }
  const req = validated

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: 'start',
      data: JSON.stringify({ phase: 'cities' }),
    })

    const useClaude = await isClaudeAvailable()
    let finalRec: LLMCityRecommendation
    let hallucinationDetected = false

    if (useClaude) {
      try {
        const prompt = buildCityPrompt(req)
        const text = await callClaude(prompt)
        await stream.writeSSE({ event: 'raw', data: JSON.stringify({ length: text.length }) })
        const parsed = extractCityJSON(text)
        if (!parsed) {
          finalRec = mockCityRecommendation(req)
          await stream.writeSSE({
            event: 'warn',
            data: JSON.stringify({ reason: 'parse_failed' }),
          })
        } else {
          const v = validateCitiesAgainstWhitelist(parsed)
          if (!v.ok) {
            hallucinationDetected = true
            console.warn('[llm/cities] D21 hallucination', {
              reason: v.reason,
              invalid: v.invalid,
              proposed: parsed.cities.map((cc) => cc.name),
            })
            await stream.writeSSE({
              event: 'error',
              data: JSON.stringify({ reason: 'hallucination', invalid: v.invalid }),
            })
            finalRec = mockCityRecommendation(req)
          } else {
            finalRec = parsed
          }
        }
      } catch (err) {
        console.error('[llm/cities] claude spawn error', err)
        finalRec = mockCityRecommendation(req)
        await stream.writeSSE({
          event: 'warn',
          data: JSON.stringify({ reason: 'claude_spawn_failed' }),
        })
      }
    } else {
      await stream.writeSSE({
        event: 'warn',
        data: JSON.stringify({ reason: 'claude_cli_unavailable', fallback: 'mock' }),
      })
      finalRec = mockCityRecommendation(req)
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
