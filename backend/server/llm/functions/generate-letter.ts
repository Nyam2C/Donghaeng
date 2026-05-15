// D39 (v2.1) — generateLetter LLM function
//
// SPECIAL 편지 일정: 사용자의 day stops → 친구가 쓴 편지처럼 풀어낸 본문.
// design-preview line 2074-2135 의 letter-body 직역 톤.
// D22 factory 패턴 (recommend-routes.ts 와 동일 호흡).

import type { GenerateLetterInput, LLMLetter } from '@trip/types'
import { createLLMFunction } from '../factory'
import { LETTER_FRAGMENT } from '../prompts'
import { GenerateLetterInputSchema, LLMLetterSchema } from '../schemas'

// ---------------------------------------------------------------------------
// Mock fallback — frontend client-side template 와 동일 결. day 별 paragraph 생성.
// ---------------------------------------------------------------------------

const WEEKDAY_GREETINGS = [
  '윤서님, 안녕하세요. 오늘 결 어때요?',
  '윤서님, 잘 잤어요? 오늘은 천천히 가요.',
  '안녕하세요. 오늘 아침 공기 좋아요.',
] as const

function pickGreeting(seed: number): string {
  return WEEKDAY_GREETINGS[seed % WEEKDAY_GREETINGS.length]
}

/** "11:30" → 시간대 ("morning" | "midday" | "afternoon" | "evening" | "night") */
function timeBucket(
  timeHint: string | undefined,
): 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' {
  if (!timeHint) return 'midday'
  const m = timeHint.match(/^(\d{1,2}):/)
  const h = m ? Number(m[1]) : 12
  if (h < 11) return 'morning'
  if (h < 14) return 'midday'
  if (h < 17) return 'afternoon'
  if (h < 20) return 'evening'
  return 'night'
}

function paragraphForStop(
  stop: { name?: string; poi_id: string; timeHint?: string; order: number },
  position: 'first' | 'middle' | 'last',
): string {
  const name = stop.name ?? stop.poi_id
  const time = stop.timeHint ?? '12:00'
  const bucket = timeBucket(stop.timeHint)

  if (position === 'first') {
    if (bucket === 'morning') {
      return `{TIME:${time}} 지금쯤 {PLACE:${name}}에서 모닝커피 한 잔하고 계시겠네요. {EM:바람이 좀 있어요}.`
    }
    return `{TIME:${time}} {PLACE:${name}}에서 시작해요. 오늘은 천천히 가도 돼요.`
  }

  if (position === 'last') {
    if (bucket === 'evening' || bucket === 'night') {
      return `{TIME:${time}} {PLACE:${name}}에서 마무리. 노을이 잘 든다면 거기서 한참 머물러도 좋고.`
    }
    return `{TIME:${time}}쯤 {PLACE:${name}}에서 마무리해요. 오늘 결 어떠셨어요?`
  }

  // middle
  if (bucket === 'midday') {
    return `점심은 {EM:가볍게}. {TIME:${time}} {PLACE:${name}}에서 샌드위치 정도. 사람 적은 시간이에요.`
  }
  if (bucket === 'afternoon') {
    return `이따 {TIME:${time}}엔 {PLACE:${name}}으로 옮길까 해요. 한 시간쯤 머물러도 좋고, 마음에 들면 더 있어도 돼요.`
  }
  if (bucket === 'evening') {
    return `저녁은 {TIME:${time}} {PLACE:${name}}. 거기 분위기, 윤서님이 좋아할 거예요.`
  }
  return `다음은 {TIME:${time}} {PLACE:${name}}. 가볍게 들렀다 가요.`
}

function mockLetter(input: GenerateLetterInput): LLMLetter {
  const paragraphs: string[] = []

  if (input.stops.length === 0) {
    paragraphs.push(
      `${pickGreeting(input.dayIndex)} 오늘 ${input.dateLabel} 은 ${input.city} 결을 가만히 느끼는 날로.`,
    )
    paragraphs.push('일정 없이 천천히. 카페 한 곳, 산책 한 번이면 충분해요.')
    return { paragraphs, signature: '— 오늘의 동행' }
  }

  // greeting paragraph
  paragraphs.push(pickGreeting(input.dayIndex))

  // stop paragraphs (각 stop = 1 paragraph, 단 stop 많으면 일부 묶음)
  const ordered = [...input.stops].sort((a, b) => a.order - b.order)
  ordered.forEach((stop, idx) => {
    const position: 'first' | 'middle' | 'last' =
      idx === 0 ? 'first' : idx === ordered.length - 1 ? 'last' : 'middle'
    paragraphs.push(paragraphForStop(stop, position))
  })

  // closing — 가벼운 한 호흡 (mock 은 고정 문구. 실제 LLM 은 더 자연스럽게)
  if (paragraphs.length < 6) {
    paragraphs.push('오늘 결, 천천히 흘러가도 괜찮아요.')
  }

  return {
    paragraphs: paragraphs.slice(0, 6),
    signature: '— 오늘의 동행',
  }
}

// ---------------------------------------------------------------------------
// User prompt 빌드 — stops 의 timeHint + name 을 friend-tone 으로 변환
// ---------------------------------------------------------------------------

function buildUserPrompt(input: GenerateLetterInput): string {
  const tagsLine = input.userStyle.tags.length > 0 ? input.userStyle.tags.join(', ') : '(없음)'
  const stopsLine =
    input.stops.length === 0
      ? '(stops 없음 — 천천히 흘러가는 날)'
      : [...input.stops]
          .sort((a, b) => a.order - b.order)
          .map((s) => {
            const time = s.timeHint ?? '—:—'
            const name = s.name ?? s.poi_id
            return `- ${time} · ${name}`
          })
          .join('\n')

  return `[도시]
${input.city}

[Day ${input.dayIndex} / ${input.totalDays} · ${input.dateLabel}]

[해당 day 의 stops — 시간순]
${stopsLine}

[사용자 결 (tags)]
${tagsLine}

[규칙]
- 친구가 쓴 편지처럼. 일정표 X. 친구가 옆에 앉아 적어준 결.
- paragraphs 2-6개, 각 60-180자.
- 첫 paragraph 는 인사/도입 ("윤서님, 안녕하세요" 같은 호흡).
- 각 stop 은 paragraphs 안에 자연스럽게 녹임. {TIME:HH:MM} + {PLACE:이름} marker 정확히 사용.
- {EM:강조어} 는 사용자 결 또는 그 장소의 호흡을 짚어줄 때 ("조용한 책방" / "사람 적은 시간" 같은).
- 마지막 paragraph 는 가벼운 한 호흡 (날씨/결/한 마디).
- AI 슬롭 X. "다음으로" / "그 다음은" 같은 격식 connector 절대 X.
- signature 는 "— 오늘의 동행" default. 다른 호흡 (예: "— 동행") 도 OK.
- JSON 만 반환: { paragraphs: [...], signature: "..." }`
}

// ---------------------------------------------------------------------------
// LLM function — D22 factory
// ---------------------------------------------------------------------------

const _generate = createLLMFunction({
  name: 'generate_letter',
  description: 'day stops 를 친구가 쓴 편지처럼 풀어낸 본문 paragraphs 생성 (D39 SPECIAL).',
  inputSchema: GenerateLetterInputSchema,
  outputSchema: LLMLetterSchema,
  systemPrompt: LETTER_FRAGMENT,
  buildUserPrompt,
  jsonHintKey: 'paragraphs',
  postValidate: (output) => {
    // paragraphs 가 marker 형식 (TIME / PLACE / EM) 정상 closing 검증
    for (const p of output.paragraphs) {
      const opens = (p.match(/\{(TIME|PLACE|EM):/g) ?? []).length
      const closes = (p.match(/\}/g) ?? []).length
      if (opens > closes) {
        return { ok: false, reason: `marker unclosed: ${p.slice(0, 40)}…` }
      }
    }
    return { ok: true }
  },
  mockFallback: mockLetter,
})

/**
 * generateLetter — D22 패턴 (parse → factory 호출).
 *
 * 입력 검증은 inputSchema 가 처리 (dayIndex/totalDays 1-10, stops 0-8).
 * marker 형식 검증은 postValidate.
 */
export async function generateLetter(
  input: GenerateLetterInput,
): Promise<Awaited<ReturnType<typeof _generate>>> {
  const parsed = GenerateLetterInputSchema.parse(input)
  return _generate(parsed)
}

// factory wrapper 도 노출 (eval / test 에서 직접 접근 필요 시)
export const generateLetterFactory = _generate
