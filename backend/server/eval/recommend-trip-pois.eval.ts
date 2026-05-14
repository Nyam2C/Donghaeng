// Phase 4a' (D29) — recommend_trip_pois eval (10 케이스)
//
// D2 hallucination guard + 친구 톤 A 등급 + dislikedIds 제외 검증.
// 직접 함수 호출 (HTTP X). Kakao Local API 실 호출 — KAKAO_REST_KEY 있어야 fully active.

import type { LLMTripPoiList } from '@trip/types'
import { recommendTripPois } from '../llm/functions/recommend-trip-pois'

interface EvalCase {
  name: string
  input: {
    city: string
    userStyle: { tags: string[]; likedPoiIds: string[]; dislikedPoiIds: string[] }
    dislikedIds?: string[]
    prompt?: string
  }
}

const CASES: EvalCase[] = [
  {
    name: '강릉 — 야경 + 맛집',
    input: {
      city: '강릉',
      userStyle: { tags: ['야경/야간', '맛집은 꼭'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '강릉 — 혼자 조용',
    input: {
      city: '강릉',
      userStyle: { tags: ['혼자가 좋아요', '계획 느슨하게'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '부산 — 혼자',
    input: {
      city: '부산',
      userStyle: { tags: ['혼자가 좋아요'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '부산 — 활기 + 맛집',
    input: {
      city: '부산',
      userStyle: { tags: ['현지인처럼', '맛집은 꼭'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '제주 남부 — 자연 결',
    input: {
      city: '제주 남부',
      userStyle: { tags: ['자연>도시', '사진 많이'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '통영 — 조용한 결',
    input: {
      city: '통영',
      userStyle: { tags: ['혼자가 좋아요', '사진 많이'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '전주 — 한옥 + 맛',
    input: {
      city: '전주',
      userStyle: { tags: ['맛집은 꼭', '사진 많이'], likedPoiIds: [], dislikedPoiIds: [] },
      prompt: '한옥마을 위주로',
    },
  },
  {
    name: '여수 — 야경',
    input: {
      city: '여수',
      userStyle: { tags: ['야경/야간'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '강릉 — dislikedIds 반영',
    input: {
      city: '강릉',
      userStyle: { tags: ['혼자가 좋아요'], likedPoiIds: [], dislikedPoiIds: [] },
      dislikedIds: ['mock-강릉-3', 'mock-강릉-5'],
    },
  },
  {
    name: '제주 남부 — prompt 재조정',
    input: {
      city: '제주 남부',
      userStyle: { tags: ['자연>도시'], likedPoiIds: [], dislikedPoiIds: [] },
      prompt: '더 한적한 카페만',
    },
  },
]

const FORBIDDEN_PHRASES = ['추천드립니다', '추천 드립니다', '있겠습니다', '습니다요']

interface AssertResult {
  pass: boolean
  msg: string
}

function assertTripPois(rec: LLMTripPoiList, dislikedIds: string[]): AssertResult[] {
  const results: AssertResult[] = []

  // 1. pois 5-30
  results.push({
    pass: rec.pois.length >= 5 && rec.pois.length <= 30,
    msg: `pois 5-30 (got ${rec.pois.length})`,
  })

  // 2. 각 POI 의 reason 길이 8-30 (한국어 12-25 권장이지만 ±)
  const badReason = rec.pois.filter((p) => p.reason.length < 5 || p.reason.length > 35)
  results.push({
    pass: badReason.length === 0,
    msg: `reason 길이 5-35 (bad=${badReason.length}, sample=${badReason[0]?.reason ?? 'none'})`,
  })

  // 3. note 길이 8-50
  results.push({
    pass: rec.note.length >= 8 && rec.note.length <= 50,
    msg: `note 길이 8-50 (got ${rec.note.length}, "${rec.note}")`,
  })

  // 4. 격식 표현 X
  const formal = FORBIDDEN_PHRASES.filter(
    (p) => rec.note.includes(p) || rec.pois.some((q) => q.reason.includes(p)),
  )
  results.push({
    pass: formal.length === 0,
    msg: `격식 표현 X (found=${formal.join(',') || 'none'})`,
  })

  // 5. match 0-100
  const badMatch = rec.pois.filter((p) => p.match < 0 || p.match > 100)
  results.push({
    pass: badMatch.length === 0,
    msg: `match 0-100 (bad=${badMatch.length})`,
  })

  // 6. dislikedIds 제외
  const disSet = new Set(dislikedIds)
  const leaked = rec.pois.filter((p) => disSet.has(p.id))
  results.push({
    pass: leaked.length === 0,
    msg: `dislikedIds 제외 (leaked=${leaked.map((p) => p.id).join(',') || 'none'})`,
  })

  // 7. id 중복 X
  const ids = rec.pois.map((p) => p.id)
  const uniqIds = new Set(ids)
  results.push({
    pass: ids.length === uniqIds.size,
    msg: `pois.id 중복 X (uniq=${uniqIds.size}/${ids.length})`,
  })

  // 8. 카테고리 mix (≥2 unique)
  const cats = new Set(rec.pois.map((p) => p.category))
  results.push({
    pass: cats.size >= 2,
    msg: `category mix ≥2 (got ${cats.size}: ${Array.from(cats).join(',')})`,
  })

  return results
}

async function main(): Promise<void> {
  console.log('=== recommend_trip_pois eval (10 케이스) ===\n')

  let totalPass = 0
  let totalFail = 0
  let hallucinationCount = 0

  for (const c of CASES) {
    const { result, hallucinationDetected, trace, kakaoPoolSize, kakaoFetchFailed } =
      await recommendTripPois(c.input)
    const asserts = assertTripPois(result, c.input.dislikedIds ?? [])
    const passed = asserts.every((a) => a.pass)
    const failed = asserts.filter((a) => !a.pass)

    if (hallucinationDetected) hallucinationCount++
    if (passed) totalPass++
    else totalFail++

    const symbol = passed ? '[OK]' : '[FAIL]'
    console.log(
      `${symbol} ${c.name} (claude=${trace.claudeUsed}, fallback=${trace.fallback}, kakaoPool=${kakaoPoolSize}, kakaoFail=${kakaoFetchFailed})`,
    )
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
