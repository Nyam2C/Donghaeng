// Phase 3.5 (D22) — recommend_pois eval (10 케이스)
//
// D2 hallucination guard 검증 + 친구 톤 lock.

import type { LLMRecommendation } from '@trip/types'
import { recommendPois } from '../llm/functions/recommend-pois'

interface KakaoPOIStub {
  id: string
  name: string
  address: string
  category: string
  lat?: number
  lng?: number
}

interface EvalCase {
  name: string
  input: {
    userStyle: { tags: string[]; likedPoiIds: string[]; dislikedPoiIds: string[] }
    utterance: string
    candidatePois: KakaoPOIStub[]
  }
}

// 가짜 POI set — 강남 근처 5 후보
const GANGNAM_POIS: KakaoPOIStub[] = [
  { id: 'kakao_27123456', name: '강남역 카페', address: '서울 강남구', category: 'CE7' },
  { id: 'kakao_27123457', name: '한옥 찻집', address: '서울 강남구', category: 'CE7' },
  { id: 'kakao_27123458', name: '청자 갤러리', address: '서울 강남구', category: 'AT4' },
  { id: 'kakao_27123459', name: '봉은사', address: '서울 강남구', category: 'AT4' },
  { id: 'kakao_27123460', name: '코엑스 몰', address: '서울 강남구', category: 'MT1' },
]

// 통영 바다 POI
const TONGYEONG_POIS: KakaoPOIStub[] = [
  { id: 'kakao_55001001', name: '동피랑 마을', address: '경남 통영', category: 'AT4' },
  { id: 'kakao_55001002', name: '통영 항구 회센터', address: '경남 통영', category: 'FD6' },
  { id: 'kakao_55001003', name: '미륵산 케이블카', address: '경남 통영', category: 'AT4' },
]

const CASES: EvalCase[] = [
  {
    name: '강남 조용히 — 한옥/갤러리 결',
    input: {
      userStyle: { tags: ['혼자가 좋아요', '조용한'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '강남 조용히',
      candidatePois: GANGNAM_POIS,
    },
  },
  {
    name: '강남 사진 — 결 + 발화',
    input: {
      userStyle: { tags: ['사진 많이'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '사진 잘 나오는 곳',
      candidatePois: GANGNAM_POIS,
    },
  },
  {
    name: '강남 + 야경',
    input: {
      userStyle: { tags: ['야경/야간'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '',
      candidatePois: GANGNAM_POIS,
    },
  },
  {
    name: '통영 바다 — 자연 결',
    input: {
      userStyle: { tags: ['자연>도시'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '바다 보고 싶어',
      candidatePois: TONGYEONG_POIS,
    },
  },
  {
    name: '통영 + 맛집',
    input: {
      userStyle: { tags: ['맛집은 꼭'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '회 먹고 싶어',
      candidatePois: TONGYEONG_POIS,
    },
  },
  {
    name: '빈 candidatePois — 친구 톤 fallback',
    input: {
      userStyle: { tags: ['혼자가 좋아요'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '주변에 갈 데 없어?',
      candidatePois: [],
    },
  },
  {
    name: '많은 결 + 1 POI',
    input: {
      userStyle: {
        tags: ['혼자가 좋아요', '계획 느슨하게', '사진 많이'],
        likedPoiIds: [],
        dislikedPoiIds: [],
      },
      utterance: '',
      candidatePois: [GANGNAM_POIS[1]], // 한옥 찻집만
    },
  },
  {
    name: 'liked/disliked 반영',
    input: {
      userStyle: {
        tags: ['사진 많이'],
        likedPoiIds: ['kakao_27123457'],
        dislikedPoiIds: ['kakao_27123460'],
      },
      utterance: '',
      candidatePois: GANGNAM_POIS,
    },
  },
  {
    name: '현지인 결 + 강남',
    input: {
      userStyle: { tags: ['현지인처럼'], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '',
      candidatePois: GANGNAM_POIS,
    },
  },
  {
    name: '자유 발화 only',
    input: {
      userStyle: { tags: [], likedPoiIds: [], dislikedPoiIds: [] },
      utterance: '잠깐 쉴 데',
      candidatePois: GANGNAM_POIS,
    },
  },
]

const FORBIDDEN_PHRASES = ['추천드립니다', '추천 드립니다', '있겠습니다', '습니다요']

interface AssertResult {
  pass: boolean
  msg: string
}

function assertRec(rec: LLMRecommendation, allowedIds: Set<string>): AssertResult[] {
  const results: AssertResult[] = []

  // 1. recommended_ids ⊂ allowedIds (D2)
  const invalid = rec.recommended_ids.filter((id) => !allowedIds.has(id))
  results.push({
    pass: invalid.length === 0,
    msg: `recommended_ids ⊂ candidatePois.id (invalid=${invalid.join(',') || 'none'})`,
  })

  // 2. 최대 3개
  results.push({
    pass: rec.recommended_ids.length <= 3,
    msg: `recommended_ids ≤ 3 (got ${rec.recommended_ids.length})`,
  })

  // 3. note 비어있지 않음 + 길이 5-80
  results.push({
    pass: rec.note.length >= 5 && rec.note.length <= 80,
    msg: `note 길이 5-80 (got ${rec.note.length})`,
  })

  // 4. 격식 표현 X
  const formal = FORBIDDEN_PHRASES.filter((p) => rec.note.includes(p))
  results.push({
    pass: formal.length === 0,
    msg: `격식 표현 X (found=${formal.join(',') || 'none'})`,
  })

  return results
}

async function main(): Promise<void> {
  console.log('=== recommend_pois eval (10 케이스) ===\n')

  let totalPass = 0
  let totalFail = 0
  let hallucinationCount = 0

  for (const c of CASES) {
    const { result, hallucinationDetected, trace } = await recommendPois(c.input)
    const allowed = new Set(c.input.candidatePois.map((p) => p.id))
    const asserts = assertRec(result, allowed)
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
