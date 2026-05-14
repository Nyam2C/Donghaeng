// Phase 4b' (D29) — recommend_routes eval (10 케이스)
//
// D2 hallucination guard (stops[].poi_id ⊂ likedPoiIds) + 친구 톤 + letter {A,B,C}.
// Claude unavailable 시 mockFallback 경로로 결정적 결과 보장 (시드 없음 — likedPoiIds 만 보고 만듦).

import type { LLMRouteList } from '@trip/types'
import { recommendRoutes } from '../llm/functions/recommend-routes'

interface EvalCase {
  name: string
  input: {
    city: string
    likedPoiIds: string[]
    userStyle: { tags: string[]; likedPoiIds: string[]; dislikedPoiIds: string[] }
  }
}

const CASES: EvalCase[] = [
  {
    name: '강릉 — liked 4개 바다 결',
    input: {
      city: '강릉',
      likedPoiIds: ['k1', 'k2', 'k3', 'k4'],
      userStyle: { tags: ['바다', '조용'], likedPoiIds: ['k1'], dislikedPoiIds: [] },
    },
  },
  {
    name: '강릉 — liked 3개 (최소)',
    input: {
      city: '강릉',
      likedPoiIds: ['mock-강릉-1', 'mock-강릉-2', 'mock-강릉-3'],
      userStyle: { tags: ['혼자가 좋아요'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '부산 — liked 6개',
    input: {
      city: '부산',
      likedPoiIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
      userStyle: { tags: ['활기'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '부산 — liked 5개 야경',
    input: {
      city: '부산',
      likedPoiIds: ['n1', 'n2', 'n3', 'n4', 'n5'],
      userStyle: { tags: ['야경'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '제주 남부 — liked 4개 자연',
    input: {
      city: '제주 남부',
      likedPoiIds: ['j1', 'j2', 'j3', 'j4'],
      userStyle: { tags: ['자연>도시', '사진'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '통영 — liked 3개 조용',
    input: {
      city: '통영',
      likedPoiIds: ['t1', 't2', 't3'],
      userStyle: { tags: ['혼자', '사진'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '전주 — liked 5개 한옥',
    input: {
      city: '전주',
      likedPoiIds: ['jj1', 'jj2', 'jj3', 'jj4', 'jj5'],
      userStyle: { tags: ['한옥', '맛집'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '여수 — liked 4개 야경',
    input: {
      city: '여수',
      likedPoiIds: ['y1', 'y2', 'y3', 'y4'],
      userStyle: { tags: ['야경'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '경주 — liked 6개',
    input: {
      city: '경주',
      likedPoiIds: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'],
      userStyle: { tags: ['역사', '사진'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
  {
    name: '속초 — liked 3개 바다',
    input: {
      city: '속초',
      likedPoiIds: ['s1', 's2', 's3'],
      userStyle: { tags: ['바다'], likedPoiIds: [], dislikedPoiIds: [] },
    },
  },
]

const FORBIDDEN_PHRASES = ['추천드립니다', '추천 드립니다', '있겠습니다', '습니다요']

interface AssertResult {
  pass: boolean
  msg: string
}

function assertRoutes(rec: LLMRouteList, likedPoiIds: string[]): AssertResult[] {
  const results: AssertResult[] = []

  // 1. routes.length === 3
  results.push({
    pass: rec.routes.length === 3,
    msg: `routes.length === 3 (got ${rec.routes.length})`,
  })

  // 2. letter === {A, B, C}
  const letters = rec.routes
    .map((r) => r.letter)
    .sort()
    .join(',')
  results.push({
    pass: letters === 'A,B,C',
    msg: `letters === A,B,C (got ${letters})`,
  })

  // 3. 모든 stops[].poi_id ⊂ likedPoiIds (D2)
  const allowed = new Set(likedPoiIds)
  const leaks: string[] = []
  for (const route of rec.routes) {
    for (const stop of route.stops) {
      if (!allowed.has(stop.poi_id)) leaks.push(`${route.letter}:${stop.poi_id}`)
    }
  }
  results.push({
    pass: leaks.length === 0,
    msg: `stops ⊂ likedPoiIds (leaks=${leaks.join(',') || 'none'})`,
  })

  // 4. moodStars 1-5 정수
  const badMood = rec.routes.filter(
    (r) => !Number.isInteger(r.moodStars) || r.moodStars < 1 || r.moodStars > 5,
  )
  results.push({
    pass: badMood.length === 0,
    msg: `moodStars 1-5 (bad=${badMood.length})`,
  })

  // 5. travelMin 30-720
  const badTravel = rec.routes.filter((r) => r.travelMin < 30 || r.travelMin > 720)
  results.push({
    pass: badTravel.length === 0,
    msg: `travelMin 30-720 (bad=${badTravel.length})`,
  })

  // 6. name 길이 2-20
  const badName = rec.routes.filter((r) => r.name.length < 2 || r.name.length > 20)
  results.push({
    pass: badName.length === 0,
    msg: `name 2-20 (bad=${badName.length})`,
  })

  // 7. reason 길이 8-40
  const badReason = rec.routes.filter((r) => r.reason.length < 8 || r.reason.length > 40)
  results.push({
    pass: badReason.length === 0,
    msg: `reason 8-40 (bad=${badReason.length})`,
  })

  // 8. note 길이 8-50
  results.push({
    pass: rec.note.length >= 8 && rec.note.length <= 50,
    msg: `note 8-50 (got ${rec.note.length}, "${rec.note}")`,
  })

  // 9. 격식 표현 X
  const formal = FORBIDDEN_PHRASES.filter(
    (p) =>
      rec.note.includes(p) || rec.routes.some((r) => r.reason.includes(p) || r.name.includes(p)),
  )
  results.push({
    pass: formal.length === 0,
    msg: `격식 표현 X (found=${formal.join(',') || 'none'})`,
  })

  // 10. 각 route 의 stops 3-8개 + order 1-based 연속
  const badStops = rec.routes.filter((r) => {
    if (r.stops.length < 3 || r.stops.length > 8) return true
    const orders = r.stops.map((s) => s.order).sort((a, b) => a - b)
    const minOk = orders[0] === 1
    return !minOk
  })
  results.push({
    pass: badStops.length === 0,
    msg: `stops 3-8 + order 1-based (bad=${badStops.length})`,
  })

  return results
}

async function main(): Promise<void> {
  console.log('=== recommend_routes eval (10 케이스) ===\n')

  let totalPass = 0
  let totalFail = 0
  let hallucinationCount = 0

  for (const c of CASES) {
    const { result, hallucinationDetected, trace } = await recommendRoutes(c.input)
    const asserts = assertRoutes(result, c.input.likedPoiIds)
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
