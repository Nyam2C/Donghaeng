// Phase 5a (D32) — chatConversation LLM function
//
// SCENARIO 07-CHAT: 채팅 default. 친구 톤 자연 응답.
// 입력: userStyle + history (최근 50턴 cap) + userMessage + tripContext.
// 출력: { response } 한 두 문장 (15-200자).
// D22 factory 패턴 (recommend-routes.ts 와 동일 호흡).

import type { LLMChatResponse } from '@trip/types'
import { createLLMFunction } from '../factory'
import { CHAT_FRAGMENT } from '../prompts'
import {
  type ChatConversationInput,
  ChatConversationInputSchema,
  LLMChatResponseSchema,
} from '../schemas'

// ---------------------------------------------------------------------------
// User prompt 빌드 — 사용자 결 + 여행 context + 최근 대화 + 지금 메시지
// ---------------------------------------------------------------------------

function buildUserPrompt(input: ChatConversationInput): string {
  const tagsLine = input.userStyle.tags.length > 0 ? input.userStyle.tags.join(', ') : '(없음)'

  const historyLines =
    input.history.length > 0
      ? input.history
          .slice(-10) // 최근 10턴만 prompt 안에 (전체 50 cap 중)
          .map((t) => `${t.speaker === 'user' ? '윤서' : '동행'}: ${t.text}`)
          .join('\n')
      : '(첫 발화)'

  const ctx = input.tripContext
  const ctxRange = ctx?.startDate && ctx?.endDate ? ` · ${ctx.startDate}~${ctx.endDate}` : ''
  const ctxLine = ctx
    ? `${ctx.city ?? '도시 미정'} · ${ctx.planningStep ?? '시작 단계'}${ctxRange}`
    : '(여행 context 없음)'

  return `[사용자 결]
${tagsLine}

[여행 context]
${ctxLine}

[최근 대화]
${historyLines}

[지금 사용자 메시지]
"${input.userMessage}"

[규칙]
- 친구 톤 한 두 문장 (15-200자).
- history 흐름 자연스럽게 이어. 처음이면 인사 톤.
- context 있으면 그 도시/step 인지.
- JSON: { "response": "..." } 만 반환.`
}

// ---------------------------------------------------------------------------
// Mock fallback — 시드 없이 결정적. keyword 기반 친구 톤.
// ---------------------------------------------------------------------------

function mockChat(input: ChatConversationInput): LLMChatResponse {
  const msg = input.userMessage.toLowerCase()

  // 동선 추가 약속
  if (msg.includes('정동진') || msg.includes('가고 싶') || msg.includes('넣어')) {
    return { response: '좋죠. 동선에 넣어볼게요. 잠시만요.' }
  }
  // 날씨/비
  if (msg.includes('비') || msg.includes('날씨') || msg.includes('흐려')) {
    return { response: '오늘 좀 흐려요. 실내 카페 어때요?' }
  }
  // 첫 발화 인사 (history 비어있을 때)
  if (input.history.length === 0) {
    const city = input.tripContext?.city ?? '오늘'
    return { response: `윤서님, ${city} 어때요. 바람이 좀 있어요.` }
  }
  // default — 한 호흡 더
  return { response: '그래요. 조금 더 자세히 말해줄래요?' }
}

// ---------------------------------------------------------------------------
// LLM function — D22 factory
// ---------------------------------------------------------------------------

const _chat = createLLMFunction({
  name: 'chat_conversation',
  description:
    '친구 톤 채팅 응답 (SCENARIO 07-CHAT, D32). 사용자 history + tripContext + userStyle 인지.',
  inputSchema: ChatConversationInputSchema,
  outputSchema: LLMChatResponseSchema,
  systemPrompt: CHAT_FRAGMENT,
  buildUserPrompt,
  jsonHintKey: 'response',
  mockFallback: mockChat,
})

/**
 * chatConversation — D22 패턴 (parse → factory 호출).
 *
 * 입력 검증은 inputSchema 가 처리 (history ≤ 50, userMessage 1-500자).
 * 친구 톤 길이 검증은 outputSchema 가 처리 (response 2-300자).
 */
export async function chatConversation(
  input: ChatConversationInput,
): Promise<Awaited<ReturnType<typeof _chat>>> {
  const parsed = ChatConversationInputSchema.parse(input)
  return _chat(parsed)
}

// factory wrapper 도 노출 (eval / test 에서 직접 접근 필요 시)
export const chatConversationFactory = _chat
