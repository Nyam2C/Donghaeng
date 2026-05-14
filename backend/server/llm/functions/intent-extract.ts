// Phase 5b (D34) — intentExtract LLM function
//
// SCENARIO 08: 채팅 발화에서 action intent 분류.
// 'add_poi' / 'remove_poi' / 'change_day' / 'show_map' / 'continue'.
// D4 voice intent (shared/types/intent.ts) 와는 별개 — 채팅 1-turn 분류.
// D22 factory 패턴 (chat-conversation.ts 와 동일 호흡).

import type { LLMIntentExtraction } from '@trip/types'
import { createLLMFunction } from '../factory'
import { INTENT_FRAGMENT } from '../prompts'
import {
  type IntentExtractionInput,
  IntentExtractionInputSchema,
  LLMIntentExtractionSchema,
} from '../schemas'

// ---------------------------------------------------------------------------
// User prompt 빌드 — context (가벼움) + 사용자 메시지
// ---------------------------------------------------------------------------

function buildUserPrompt(input: IntentExtractionInput): string {
  const ctx = input.tripContext
  const ctxRange = ctx?.startDate && ctx?.endDate ? ` · ${ctx.startDate}~${ctx.endDate}` : ''
  const ctxLine = ctx
    ? `${ctx.city ?? '도시 미정'} · ${ctx.planningStep ?? '시작 단계'}${ctxRange}`
    : '(여행 context 없음)'

  return `[여행 context]
${ctxLine}

[사용자 메시지]
"${input.userMessage}"

[규칙]
- intent 1개. add_poi 면 poiName 추출 (사용자 발화의 장소명, 한국어 그대로).
- remove_poi 면 removeName. change_day 면 targetDay (1-based 정수).
- 모르겠으면 "continue".
- JSON: { intent, poiName?, removeName?, targetDay? } 만 반환.`
}

// ---------------------------------------------------------------------------
// Mock fallback — 시드 없이 결정적. keyword 기반 분류.
// ---------------------------------------------------------------------------

const ADD_RE = /(가고\s?싶|들러|추가|넣어줘|도\s?가|도\s?가볼|들렸으면)/
const REMOVE_RE = /(빼|말고|취소|없애)/
const MAP_RE = /(지도|위치\s?보여|어디인지)/
const CHANGE_DAY_RE = /(내일|첫\s?째날|첫\s?날|둘\s?째날|두\s?째날|셋\s?째날)/

/** "정동진도" → "정동진". 조사 제거. */
function extractPoiName(msg: string): string {
  // 가장 먼저 "X도/X를/X에/X은/X이" 패턴 매칭
  const withParticle = msg.match(/([가-힣A-Za-z]{2,12})(?:도|를|을|에|이|은)/)
  if (withParticle) return withParticle[1]
  // 한글 명사 1개 어림
  const noun = msg.match(/([가-힣]{2,8})/)
  return noun?.[1] ?? ''
}

function extractTargetDay(msg: string): number | undefined {
  if (/내일/.test(msg)) return 2
  if (/(첫\s?째날|첫\s?날)/.test(msg)) return 1
  if (/(둘\s?째날|두\s?째날)/.test(msg)) return 2
  if (/(셋\s?째날|세\s?째날)/.test(msg)) return 3
  const m = msg.match(/(\d+)\s?일차/)
  if (m) {
    const n = Number(m[1])
    if (n >= 1 && n <= 10) return n
  }
  return undefined
}

function mockIntent(input: IntentExtractionInput): LLMIntentExtraction {
  const msg = input.userMessage
  if (ADD_RE.test(msg)) {
    const poiName = extractPoiName(msg)
    return poiName ? { intent: 'add_poi', poiName } : { intent: 'add_poi' }
  }
  if (REMOVE_RE.test(msg)) {
    const removeName = extractPoiName(msg)
    return removeName ? { intent: 'remove_poi', removeName } : { intent: 'remove_poi' }
  }
  if (MAP_RE.test(msg)) return { intent: 'show_map' }
  if (CHANGE_DAY_RE.test(msg)) {
    const targetDay = extractTargetDay(msg)
    return targetDay ? { intent: 'change_day', targetDay } : { intent: 'change_day' }
  }
  return { intent: 'continue' }
}

// ---------------------------------------------------------------------------
// LLM function — D22 factory
// ---------------------------------------------------------------------------

const _intent = createLLMFunction({
  name: 'intent_extract',
  description: '채팅 메시지에서 action intent 추출 (D34 SCENARIO 08).',
  inputSchema: IntentExtractionInputSchema,
  outputSchema: LLMIntentExtractionSchema,
  systemPrompt: INTENT_FRAGMENT,
  buildUserPrompt,
  jsonHintKey: 'intent',
  mockFallback: mockIntent,
})

/**
 * intentExtract — D22 패턴 (parse → factory 호출).
 *
 * 입력 검증은 inputSchema 가 처리 (userMessage 1-500자).
 * 출력 enum 검증은 outputSchema 가 처리.
 */
export async function intentExtract(
  input: IntentExtractionInput,
): Promise<Awaited<ReturnType<typeof _intent>>> {
  const parsed = IntentExtractionInputSchema.parse(input)
  return _intent(parsed)
}

// factory wrapper 도 노출 (eval / test 에서 직접 접근 필요 시)
export const intentExtractFactory = _intent
