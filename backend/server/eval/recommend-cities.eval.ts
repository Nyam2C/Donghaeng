// Phase 3.5 (D22) — recommend_cities eval (10 케이스)
//
// 친구 톤 A 등급 baseline lock — 격식 표현 차단 + length === 4 + whitelist 검증.
// 직접 함수 호출 (HTTP X) — 빠르고 isolation 좋다.

import type { LLMCityRecommendation } from '@trip/types'
import { recommendCities } from '../llm/functions/recommend-cities'
import { KOREAN_CITY_SET } from '../llm/schemas'

interface EvalCase {
  name: string
  input: {
    userStyle: { tags: string[]; likedPoiIds: string[]; dislikedPoiIds: string[] }
    utterance: string
  }
}

const CASES: EvalCase[] = [
  {
    name: '혼자 조용히',
    input: {
      userStyle: { tags: ['혼자가 좋아요', '계획 느슨하게'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '',
    },
  },
  {
    name: '맛집 + 야경',
    input: {
      userStyle: { tags: ['야경/야간', '맛집은 꼭'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '',
    },
  },
  {
    name: '자연 우선',
    input: {
      userStyle: { tags: ['자연>도시', '사진 많이'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '',
    },
  },
  {
    name: '체력 좋음 + 현지인',
    input: {
      userStyle: { tags: ['체력 좋아요', '현지인처럼'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '',
    },
  },
  {
    name: '자유 발화 — 바다',
    input: {
      userStyle: { tags: [], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '바다 보고 싶어',
    },
  },
  {
    name: '자유 발화 — 한옥',
    input: {
      userStyle: { tags: ['사진 많이'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '한옥 골목 걷고 싶어',
    },
  },
  {
    name: '빈 결',
    input: {
      userStyle: { tags: [], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '',
    },
  },
  {
    name: '복합 — 사진 + 맛집',
    input: {
      userStyle: { tags: ['사진 많이', '맛집은 꼭'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '',
    },
  },
  {
    name: '복합 — 자연 + 야경',
    input: {
      userStyle: { tags: ['자연>도시', '야경/야간'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '',
    },
  },
  {
    name: '복합 — 현지인 + 계획 느슨',
    input: {
      userStyle: { tags: ['현지인처럼', '계획 느슨하게'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '',
    },
  },
]

// 격식 표현 차단 — 친구 톤 A 등급 baseline lock
const FORBIDDEN_PHRASES = ['추천드립니다', '추천 드립니다', '있겠습니다', '습니다요']

interface AssertResult {
  pass: boolean
  msg: string
}

function assertCities(rec: LLMCityRecommendation): AssertResult[] {
  const results: AssertResult[] = []

  // 1. length === 4
  results.push({
    pass: rec.cities.length === 4,
    msg: `cities.length === 4 (got ${rec.cities.length})`,
  })

  // 2. 모든 도시 whitelist 안
  const invalidNames = rec.cities.filter((c) => !KOREAN_CITY_SET.has(c.name))
  results.push({
    pass: invalidNames.length === 0,
    msg: `cities ⊂ KOREAN_CITY_WHITELIST (invalid=${invalidNames.map((c) => c.name).join(',') || 'none'})`,
  })

  // 3. reason 길이 5-35
  const badReasons = rec.cities.filter((c) => c.reason.length < 5 || c.reason.length > 35)
  results.push({
    pass: badReasons.length === 0,
    msg: `reason 길이 5-35 (bad=${badReasons.length})`,
  })

  // 4. note 길이 10-50
  results.push({
    pass: rec.note.length >= 10 && rec.note.length <= 50,
    msg: `note 길이 10-50 (got ${rec.note.length})`,
  })

  // 5. 격식 표현 X
  const formal = FORBIDDEN_PHRASES.filter(
    (p) => rec.note.includes(p) || rec.cities.some((c) => c.reason.includes(p)),
  )
  results.push({
    pass: formal.length === 0,
    msg: `격식 표현 X (found=${formal.join(',') || 'none'})`,
  })

  // 6. match 0-100
  const badMatch = rec.cities.filter((c) => c.match < 0 || c.match > 100)
  results.push({
    pass: badMatch.length === 0,
    msg: `match 0-100 (bad=${badMatch.length})`,
  })

  return results
}

async function main(): Promise<void> {
  console.log('=== recommend_cities eval (10 케이스) ===\n')

  let totalPass = 0
  let totalFail = 0
  let hallucinationCount = 0

  for (const c of CASES) {
    const { result, hallucinationDetected, trace } = await recommendCities(c.input)
    const asserts = assertCities(result)
    const passed = asserts.every((a) => a.pass)
    const failed = asserts.filter((a) => !a.pass)

    if (hallucinationDetected) hallucinationCount++
    if (passed) totalPass++
    else totalFail++

    const symbol = passed ? '[OK]' : '[FAIL]'
    console.log(`${symbol} ${c.name} (claude=${trace.claudeUsed}, fallback=${trace.fallback})`)
    if (!passed) {
      for (const f of failed) console.log(`     - ${f.msg}`)
    }
  }

  console.log(`\n=== ${totalPass}/${CASES.length} pass · hallucination=${hallucinationCount} ===`)
  if (totalFail > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
