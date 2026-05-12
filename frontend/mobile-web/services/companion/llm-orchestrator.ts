import type { KakaoPOI, LLMRecommendation, UserStyle } from '@trip/types'

export async function* streamRecommendation(_input: {
  userStyle: UserStyle
  utterance: string
  candidatePois: KakaoPOI[]
}): AsyncGenerator<{ chunk: string; final?: LLMRecommendation }> {
  yield await Promise.reject(new Error('NotImplemented · Phase 3-4 타겟 (D2: ID validation 강제)'))
}
