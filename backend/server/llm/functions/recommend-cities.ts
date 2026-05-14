// Phase 3.5 (D22) — recommendCities LLM function
//
// SCENARIO 02: 결과 발화 → 한국 4 도시 추천.
// D21 정신: cities[].name ⊂ KOREAN_CITY_WHITELIST + length === 4.
// match 정규화 (0~1 또는 0~100 → 0~100 정수).

import type { LLMCityRecommendation } from '@trip/types'
import { LLMCityRecommendationSchema, type RecommendCitiesInput } from '@trip/types'
import { createLLMFunction } from '../factory'
import { CITY_FRAGMENT } from '../prompts'
import { KOREAN_CITY_SET, RecommendCitiesInputSchema } from '../schemas'

// 결 → 후보 도시 풀 (mockFallback 용)
const POOLS = {
  quiet: ['강릉', '통영', '제주 남부', '단양'],
  photo: ['경주', '안동', '전주', '여수'],
  sea: ['속초', '거제', '제주 남부', '여수'],
  mountain: ['평창', '단양', '가평', '춘천'],
  food: ['전주', '통영', '부산', '춘천'],
  lively: ['부산', '서울', '제주시', '여수'],
}

const REASONS: Record<string, string> = {
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
  서울: '익숙함 속 새 골목',
  제주시: '도시와 바다 사이',
}

function mockCities(input: RecommendCitiesInput): LLMCityRecommendation {
  const tags = input.userStyle.tags.map((t) => t.toLowerCase())
  const has = (kw: string): boolean => tags.some((t) => t.includes(kw))

  let pool: string[]
  if (has('혼자') || has('조용')) pool = [...POOLS.quiet, ...POOLS.photo]
  else if (has('사진')) pool = [...POOLS.photo, ...POOLS.quiet]
  else if (has('바다')) pool = [...POOLS.sea, ...POOLS.quiet]
  else if (has('산') || has('숲')) pool = [...POOLS.mountain, ...POOLS.quiet]
  else if (has('맛') || has('먹')) pool = [...POOLS.food, ...POOLS.lively]
  else if (has('활기') || has('사람')) pool = [...POOLS.lively, ...POOLS.food]
  else pool = [...POOLS.quiet, ...POOLS.photo]

  const picked: string[] = []
  for (const c of pool) {
    if (!picked.includes(c) && KOREAN_CITY_SET.has(c)) picked.push(c)
    if (picked.length === 4) break
  }
  const defaults = ['강릉', '통영', '제주 남부', '거제']
  for (const c of defaults) {
    if (picked.length === 4) break
    if (!picked.includes(c)) picked.push(c)
  }

  return {
    cities: picked.map((name, i) => ({
      name,
      reason: REASONS[name] ?? '결에 맞는 곳이에요',
      match: 92 - i * 5,
    })),
    note: '비슷한 결, 다른 결로 섞었어요.',
  }
}

function buildUserPrompt(input: RecommendCitiesInput): string {
  const tagsLine = input.userStyle.tags.length > 0 ? input.userStyle.tags.join(', ') : '(없음)'
  const utterance = input.utterance.trim().length > 0 ? input.utterance : '(별도 발화 없음)'
  const hintCities =
    '강릉, 통영, 제주 남부, 거제, 부산, 경주, 안동, 전주, 여수, 순천, 속초, 양양, 가평, 춘천, 평창, 단양, 영주, 안성, 평택, 군산, 익산'

  return `[사용자 결 (태그)]
${tagsLine}

[추가 발화]
"${utterance}"

[규칙]
- cities 는 정확히 4개. 비슷한 결 2 + 다른 결 2 로 섞기.
- name 은 한국 실재 도시명만. 예: ${hintCities}.
- 새 도시명 생성 X. 광역시도 또는 시군구. 제주는 "제주 남부" / "제주 동부" 같은 권역 허용.
- reason 12-25자 친구 톤.
- match 0~100 정수, 사용자 결과 도시 분위기의 매칭도.
- note 15-30자 친구 톤.`
}

export const recommendCities = createLLMFunction({
  name: 'recommend_cities',
  description:
    '사용자 결 태그 + 자유 발화를 받아 한국 국내 4 도시를 추천한다 (SCENARIO 02). 도시명은 한국 실재 whitelist 안에서만.',
  inputSchema: RecommendCitiesInputSchema,
  outputSchema: LLMCityRecommendationSchema,
  systemPrompt: CITY_FRAGMENT,
  buildUserPrompt,
  jsonHintKey: 'cities',
  postValidate: (output) => {
    if (output.cities.length !== 4) {
      return { ok: false, reason: `length=${output.cities.length}` }
    }
    // match 정규화 + whitelist 검증
    const invalid: string[] = []
    for (const c of output.cities) {
      if (!KOREAN_CITY_SET.has(c.name)) invalid.push(c.name)
      // match 정규화 (0~1 → 0~100, side effect — output 직접 수정)
      const m = c.match <= 1 ? c.match * 100 : c.match
      c.match = Math.max(0, Math.min(100, Math.round(m)))
    }
    if (invalid.length > 0) {
      return { ok: false, reason: `whitelist:${invalid.join(',')}` }
    }
    return { ok: true }
  },
  mockFallback: mockCities,
})
