// Phase 4a' (D29) — recommendTripPois LLM function
//
// SCENARIO 03: 도시 결정 후 그 안에서 가볼 만한 POI 친구처럼 큐레이션.
// D2 정신: 각 POI 의 id 는 Kakao Local API search 응답 ⊂ — invalid 시 mock fallback.
// Kakao pool 을 함수 내부에서 fetch → system prompt 에 그 id 들 안에서만 추천하라 제약.
// D22 factory 패턴 재사용.

import type { LLMTripPoiList, RecommendTripPoisInput, TripPoiCandidate } from '@trip/types'
import { createLLMFunction } from '../factory'
import { TRIP_POI_FRAGMENT } from '../prompts'
import { LLMTripPoiListSchema, RecommendTripPoisInputSchema } from '../schemas'

// ---------------------------------------------------------------------------
// Kakao Local API search — 도시별 POI pool fetch (~30 개)
// ---------------------------------------------------------------------------

const KAKAO_BASE = 'https://dapi.kakao.com/v2/local/search'

// Kakao category_group_code → 친구 톤 한 줄 카테고리 라벨
// CE7=카페, FD6=음식점, AT4=관광명소, CT1=문화시설, AD5=숙박, MT1=대형마트 외
const CATEGORY_LABEL: Record<string, string> = {
  CE7: '카페',
  FD6: '맛집',
  AT4: '관광',
  CT1: '문화',
  AD5: '숙소',
}

interface KakaoDocument {
  id: string
  place_name: string
  category_group_code?: string
  category_name?: string
  road_address_name?: string
  address_name?: string
}

interface KakaoKeywordResponse {
  documents: KakaoDocument[]
}

interface KakaoPoolEntry {
  id: string
  name: string
  category: string
  rawCategoryCode: string
}

function getKakaoKey(): string | null {
  const k = process.env.KAKAO_REST_KEY
  return k && k.length > 0 ? k : null
}

function mapKakaoDoc(doc: KakaoDocument): KakaoPoolEntry {
  const code = doc.category_group_code ?? ''
  const label = CATEGORY_LABEL[code] ?? '장소'
  return {
    id: doc.id,
    name: doc.place_name,
    category: label,
    rawCategoryCode: code,
  }
}

/**
 * 도시 → Kakao Local API search 로 ~30 POI pool fetch.
 * 다양성을 위해 카페·맛집·관광 3 카테고리에서 각 10 정도 가져온 뒤 dedupe.
 * KAKAO_REST_KEY 없거나 fetch 실패 시 빈 배열 반환 (caller 가 mock fallback).
 */
export async function fetchKakaoPool(city: string): Promise<KakaoPoolEntry[]> {
  const key = getKakaoKey()
  if (!key) return []

  const queries = [
    { q: `${city} 카페`, size: 10 },
    { q: `${city} 맛집`, size: 10 },
    { q: `${city} 관광`, size: 10 },
  ]
  try {
    const results = await Promise.all(
      queries.map(async ({ q, size }) => {
        const url = `${KAKAO_BASE}/keyword.json?query=${encodeURIComponent(q)}&size=${size}`
        const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
        if (!res.ok) return [] as KakaoDocument[]
        const data = (await res.json()) as KakaoKeywordResponse
        return data.documents
      }),
    )
    const seen = new Set<string>()
    const pool: KakaoPoolEntry[] = []
    for (const docs of results) {
      for (const doc of docs) {
        if (seen.has(doc.id)) continue
        seen.add(doc.id)
        pool.push(mapKakaoDoc(doc))
        if (pool.length >= 30) return pool
      }
    }
    return pool
  } catch (err) {
    console.warn('[recommend-trip-pois] Kakao fetch error', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Mock fallback — 도시별 hardcoded POI (Kakao 무가용 / hallucination 시)
// 각 reason 친구 톤 A 등급. id 는 mock prefix 로 명시.
// ---------------------------------------------------------------------------

const MOCK_BY_CITY: Record<string, TripPoiCandidate[]> = {
  강릉: [
    {
      id: 'mock-강릉-1',
      name: '안목해변 커피거리',
      category: '카페',
      reason: '바다 보며 라떼 한 잔',
      match: 94,
    },
    {
      id: 'mock-강릉-2',
      name: '경포대 일출',
      category: '관광',
      reason: '새벽 공기 그 결',
      match: 92,
    },
    {
      id: 'mock-강릉-3',
      name: '주문진 회센터',
      category: '맛집',
      reason: '회 한 점 캬, 진짜',
      match: 90,
    },
    { id: 'mock-강릉-4', name: '오죽헌', category: '문화', reason: '한옥 천천히 걷기', match: 85 },
    {
      id: 'mock-강릉-5',
      name: '정동진 모래시계',
      category: '관광',
      reason: '기차역 바로 앞 바다',
      match: 84,
    },
    {
      id: 'mock-강릉-6',
      name: '테라로사 본점',
      category: '카페',
      reason: '커피 향이 깊어요',
      match: 88,
    },
    {
      id: 'mock-강릉-7',
      name: '초당순두부',
      category: '맛집',
      reason: '아침 든든히 한 그릇',
      match: 83,
    },
    {
      id: 'mock-강릉-8',
      name: '강문해변',
      category: '관광',
      reason: '한적한 해변 산책',
      match: 81,
    },
    {
      id: 'mock-강릉-9',
      name: '하슬라 아트월드',
      category: '문화',
      reason: '바다 보는 미술관',
      match: 79,
    },
    {
      id: 'mock-강릉-10',
      name: '교동짬뽕',
      category: '맛집',
      reason: '강릉 사람들의 그 맛',
      match: 86,
    },
  ],
  부산: [
    {
      id: 'mock-부산-1',
      name: '광안리해변',
      category: '관광',
      reason: '광안대교 야경 진리',
      match: 95,
    },
    {
      id: 'mock-부산-2',
      name: '해운대 블루라인파크',
      category: '관광',
      reason: '바다 옆 빨간 기차',
      match: 90,
    },
    {
      id: 'mock-부산-3',
      name: '자갈치 회센터',
      category: '맛집',
      reason: '회 갓 떠올린 거 캬',
      match: 92,
    },
    {
      id: 'mock-부산-4',
      name: '감천문화마을',
      category: '문화',
      reason: '골목골목 사진 좋아요',
      match: 88,
    },
    {
      id: 'mock-부산-5',
      name: '전포 카페거리',
      category: '카페',
      reason: '한적한 골목 카페들',
      match: 84,
    },
    {
      id: 'mock-부산-6',
      name: '오반장 게장',
      category: '맛집',
      reason: '게장은 진리, 진짜',
      match: 91,
    },
    { id: 'mock-부산-7', name: '태종대', category: '관광', reason: '절벽 바다 산책', match: 82 },
    {
      id: 'mock-부산-8',
      name: '송정 서피비치',
      category: '관광',
      reason: '서핑 보러만 가도 좋아요',
      match: 80,
    },
    {
      id: 'mock-부산-9',
      name: '깡통시장',
      category: '맛집',
      reason: '저녁 야시장 분위기',
      match: 85,
    },
    {
      id: 'mock-부산-10',
      name: '모모스 커피',
      category: '카페',
      reason: '커피 향 진하게',
      match: 83,
    },
  ],
  '제주 남부': [
    {
      id: 'mock-제주남부-1',
      name: '쇠소깍',
      category: '관광',
      reason: '에메랄드빛 골짜기',
      match: 92,
    },
    {
      id: 'mock-제주남부-2',
      name: '천지연 폭포',
      category: '관광',
      reason: '시원한 물소리 그 결',
      match: 88,
    },
    {
      id: 'mock-제주남부-3',
      name: '올레시장',
      category: '맛집',
      reason: '흑돼지 한 점 꼭',
      match: 90,
    },
    {
      id: 'mock-제주남부-4',
      name: '서귀포 매일올레',
      category: '맛집',
      reason: '갈치조림은 여기',
      match: 87,
    },
    {
      id: 'mock-제주남부-5',
      name: '카페 그랑블루',
      category: '카페',
      reason: '바다 보며 한 잔',
      match: 89,
    },
    {
      id: 'mock-제주남부-6',
      name: '엉덩물 계곡',
      category: '관광',
      reason: '숨겨진 한적 계곡',
      match: 81,
    },
    { id: 'mock-제주남부-7', name: '약천사', category: '문화', reason: '바다 보는 절', match: 78 },
    {
      id: 'mock-제주남부-8',
      name: '중문 색달해변',
      category: '관광',
      reason: '서핑 명소 그 결',
      match: 84,
    },
    {
      id: 'mock-제주남부-9',
      name: '귤밭 게스트하우스',
      category: '카페',
      reason: '귤 따며 차 한 잔',
      match: 82,
    },
    {
      id: 'mock-제주남부-10',
      name: '대포 주상절리',
      category: '관광',
      reason: '돌기둥 절벽 뷰',
      match: 86,
    },
  ],
}

const GENERIC_MOCK = (city: string): TripPoiCandidate[] => [
  {
    id: `mock-${city}-1`,
    name: `${city} 시내 카페거리`,
    category: '카페',
    reason: '한적한 골목 분위기',
    match: 86,
  },
  {
    id: `mock-${city}-2`,
    name: `${city} 전통 시장`,
    category: '맛집',
    reason: '현지 사람들 그 결',
    match: 84,
  },
  {
    id: `mock-${city}-3`,
    name: `${city} 박물관`,
    category: '문화',
    reason: '이 동네 이야기 천천히',
    match: 80,
  },
  {
    id: `mock-${city}-4`,
    name: `${city} 자연 공원`,
    category: '관광',
    reason: '산책하기 좋아요',
    match: 82,
  },
  {
    id: `mock-${city}-5`,
    name: `${city} 야경 명소`,
    category: '관광',
    reason: '저녁 빛이 좋대요',
    match: 83,
  },
  {
    id: `mock-${city}-6`,
    name: `${city} 핫플 식당`,
    category: '맛집',
    reason: '동네 사람 손맛',
    match: 85,
  },
  {
    id: `mock-${city}-7`,
    name: `${city} 한적 카페`,
    category: '카페',
    reason: '커피 한 잔 길게',
    match: 81,
  },
  {
    id: `mock-${city}-8`,
    name: `${city} 산책로`,
    category: '관광',
    reason: '걷기 좋은 길',
    match: 79,
  },
]

function mockTripPois(input: RecommendTripPoisInput): LLMTripPoiList {
  const base = MOCK_BY_CITY[input.city] ?? GENERIC_MOCK(input.city)
  const disliked = new Set(input.dislikedIds ?? [])
  const filtered = base.filter((p) => !disliked.has(p.id))
  // 최소 5개 보장 (스키마 최소). 부족하면 GENERIC 으로 채움
  let pois = filtered
  if (pois.length < 5) {
    const generic = GENERIC_MOCK(input.city).filter((p) => !disliked.has(p.id))
    pois = [...pois, ...generic].slice(0, Math.max(5, pois.length))
  }
  return {
    pois: pois.slice(0, 10),
    note: '결에 맞을 만한 곳들로 골라봤어요',
  }
}

// ---------------------------------------------------------------------------
// User prompt 빌드 — Kakao pool 의 id 만 안에서 추천하라 명시
// ---------------------------------------------------------------------------

interface PromptCtx {
  pool: KakaoPoolEntry[]
}

const promptCtxByCity = new Map<string, PromptCtx>()

function buildUserPrompt(input: RecommendTripPoisInput): string {
  const ctx = promptCtxByCity.get(input.city) ?? { pool: [] }
  const tagsLine = input.userStyle.tags.length > 0 ? input.userStyle.tags.join(', ') : '(없음)'
  const likedLine =
    input.userStyle.likedPoiIds.length > 0 ? input.userStyle.likedPoiIds.join(', ') : '(없음)'
  const dislikedLine =
    input.dislikedIds && input.dislikedIds.length > 0 ? input.dislikedIds.join(', ') : '(없음)'
  const promptLine =
    input.prompt && input.prompt.trim().length > 0 ? `"${input.prompt.trim()}"` : '(없음)'

  const poolLines =
    ctx.pool.length > 0
      ? ctx.pool.map((p) => `- id="${p.id}" | ${p.name} | ${p.category}`).join('\n')
      : '(Kakao pool 비어있음 — 결에 맞는 도시 대표 장소 5-10개를 일반 상식으로 추천)'

  const poolNote =
    ctx.pool.length > 0
      ? '아래 후보 풀의 id 중에서만 선택해. 새 id 생성 X.'
      : '후보 풀이 비어있으니, 그 도시의 실재 장소를 보통의 여행자 기준으로 추천 (이 경우 id 는 "mock-도시-N" 형태 가능).'

  return `[도시]
${input.city}

[사용자 결 (태그)]
${tagsLine}

[좋아요 history]
${likedLine}

[싫어요 — 이 id 들은 *반드시 제외*]
${dislikedLine}

[자유 발화 / 재조정 prompt]
${promptLine}

[후보 풀 — ${poolNote}]
${poolLines}

[규칙]
- pois 는 5-15개. 카페·맛집·관광·문화·자연 카테고리 mix.
- 각 POI 의 id 는 후보 풀의 id 만 (Kakao pool 있는 경우).
- reason 12-25자 친구 톤 ("회 한 점 캬" 같은 자연 어휘 환영. "추천드립니다" 같은 격식 X).
- match 0-100 정수, 사용자 결과의 매칭도.
- dislikedIds 의 id 들은 결과에서 *제외*.
- note 15-30자 친구 톤.`
}

// ---------------------------------------------------------------------------
// LLM function — D22 factory + Kakao pool 사전 fetch wrapper
// ---------------------------------------------------------------------------

const _recommend = createLLMFunction({
  name: 'recommend_trip_pois',
  description:
    '도시 결정 후 그 안에서 친구처럼 ~15 POI 큐레이션 (SCENARIO 03). pois[].id 는 Kakao Local API search 응답의 id ⊂ (D2).',
  inputSchema: RecommendTripPoisInputSchema,
  outputSchema: LLMTripPoiListSchema,
  systemPrompt: TRIP_POI_FRAGMENT,
  buildUserPrompt,
  jsonHintKey: 'pois',
  postValidate: (output, input) => {
    const ctx = promptCtxByCity.get(input.city)
    if (!ctx || ctx.pool.length === 0) {
      // Kakao pool 비어있으면 LLM 자유 응답 허용 (mock-* id)
      return { ok: true }
    }
    const allowed = new Set(ctx.pool.map((p) => p.id))
    const invalid = output.pois.filter((p) => !allowed.has(p.id))
    if (invalid.length > 0) {
      return {
        ok: false,
        reason: `hallucination:${invalid.map((p) => p.id).join(',')}`,
      }
    }
    // dislikedIds 제외 검증
    if (input.dislikedIds && input.dislikedIds.length > 0) {
      const dis = new Set(input.dislikedIds)
      const leaked = output.pois.filter((p) => dis.has(p.id))
      if (leaked.length > 0) {
        return { ok: false, reason: `disliked-leak:${leaked.map((p) => p.id).join(',')}` }
      }
    }
    return { ok: true }
  },
  mockFallback: mockTripPois,
})

/**
 * recommendTripPois — Kakao pool 사전 fetch 후 factory 호출.
 *
 * Kakao pool fetch 결과를 promptCtxByCity 에 보관해서 buildUserPrompt 와
 * postValidate 가 동일 도시 컨텍스트를 참조. 호출 단위로 갈아끼움 — race 는
 * 같은 도시 동시 호출 시 last-write-wins (실용상 무해, pool 자체는 결과 일관).
 */
export async function recommendTripPois(
  input: RecommendTripPoisInput,
): Promise<
  Awaited<ReturnType<typeof _recommend>> & { kakaoPoolSize: number; kakaoFetchFailed: boolean }
> {
  const parsed = RecommendTripPoisInputSchema.parse(input)
  const pool = await fetchKakaoPool(parsed.city)
  const kakaoFetchFailed = pool.length === 0 && getKakaoKey() !== null
  promptCtxByCity.set(parsed.city, { pool })

  const r = await _recommend(parsed)
  return {
    ...r,
    kakaoPoolSize: pool.length,
    kakaoFetchFailed,
  }
}

// factory wrapper 도 노출 (eval / test 에서 직접 접근 필요 시)
export const recommendTripPoisFactory = _recommend
