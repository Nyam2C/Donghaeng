// Phase 3.5 (D22) — recommendPois LLM function
//
// POST /api/llm: 후보 POI list → recommended_ids ⊂ candidatePois.id 보장 (D2).

import type { LLMRecommendation } from '@trip/types'
import { LLMRecommendationSchema, type RecommendPoisInput } from '@trip/types'
import { createLLMFunction } from '../factory'
import { POI_FRAGMENT } from '../prompts'
import { RecommendPoisInputSchema } from '../schemas'

function mockPois(input: RecommendPoisInput): LLMRecommendation {
  if (input.candidatePois.length === 0) {
    return {
      recommended_ids: [],
      note: '지금 주변엔 마땅한 곳이 없네요. 조금만 더 걸어볼까요?',
    }
  }
  const top = input.candidatePois.slice(0, 3).map((p) => p.id)
  const firstName = input.candidatePois[0].name
  return {
    recommended_ids: top,
    note: `${firstName} 어때요? 지금 분위기랑 잘 맞을 것 같아요.`,
  }
}

function buildUserPrompt(input: RecommendPoisInput): string {
  const candidateLines = input.candidatePois
    .map((p) => `- id="${p.id}" | ${p.name} | ${p.address} | ${p.category}`)
    .join('\n')
  const tagsLine = input.userStyle.tags.length > 0 ? input.userStyle.tags.join(', ') : '(없음)'
  const likedLine =
    input.userStyle.likedPoiIds.length > 0 ? input.userStyle.likedPoiIds.join(', ') : '(없음)'
  const dislikedLine =
    input.userStyle.dislikedPoiIds.length > 0 ? input.userStyle.dislikedPoiIds.join(', ') : '(없음)'

  return `[사용자 발화]
"${input.utterance}"

[사용자 취향]
- tags: ${tagsLine}
- liked: ${likedLine}
- disliked: ${dislikedLine}

[후보 장소 — 이 id 중에서만 골라야 함]
${candidateLines || '(후보 없음)'}

[규칙]
- recommended_ids 는 위 후보의 id 중에서만. 새 id 생성 X.
- 최대 3개. 후보가 없으면 빈 배열.
- note 15-30자 친구 톤 한국어.`
}

export const recommendPois = createLLMFunction({
  name: 'recommend_pois',
  description:
    '주변 POI 후보 list 와 사용자 결을 받아 친구가 옆에서 골라주듯 1-3개 추천한다. recommended_ids 는 반드시 후보 id 안에서만 (D2 hallucination 가드).',
  inputSchema: RecommendPoisInputSchema,
  outputSchema: LLMRecommendationSchema,
  systemPrompt: POI_FRAGMENT,
  buildUserPrompt,
  jsonHintKey: 'recommended_ids',
  postValidate: (output, input) => {
    const allowed = new Set(input.candidatePois.map((p) => p.id))
    const invalid = output.recommended_ids.filter((id) => !allowed.has(id))
    if (invalid.length > 0) {
      return { ok: false, reason: `hallucination:${invalid.join(',')}` }
    }
    return { ok: true }
  },
  mockFallback: mockPois,
})
