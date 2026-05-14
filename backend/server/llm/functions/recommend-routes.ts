// Phase 4b' (D29) — recommendRoutes LLM function
//
// SCENARIO 04: 좋아요 ≥3 POI 후 3 갈래 동선 (Plan A/B/C) 큐레이션.
// D2 정신 가장 중요: 각 stop.poi_id 는 input.likedPoiIds ⊂ — invalid 시 mock fallback.
// D22 factory 패턴 재사용 (recommend-trip-pois.ts 와 동일 호흡).

import type { LLMRoute, LLMRouteList, RecommendRoutesInput } from '@trip/types'
import { createLLMFunction } from '../factory'
import { ROUTES_FRAGMENT } from '../prompts'
import { LLMRouteListSchema, RecommendRoutesInputSchema } from '../schemas'

// ---------------------------------------------------------------------------
// Mock fallback — 친구 톤. likedPoiIds 만 보고 결정적으로 3 갈래 동선 구성.
// Plan A "둘러보기" : likedPoiIds head order, 다양하게.
// Plan B "결 따라"   : 역순 + 다른 호흡.
// Plan C "한 곳 깊게": stop 적게 (3개), 머무는 결.
// ---------------------------------------------------------------------------

function pickStops(ids: string[], count: number): Array<{ poi_id: string; order: number }> {
  const clamped = Math.max(3, Math.min(count, ids.length, 6))
  return ids.slice(0, clamped).map((poi_id, i) => ({ poi_id, order: i + 1 }))
}

function pickStopsReversed(ids: string[], count: number): Array<{ poi_id: string; order: number }> {
  const clamped = Math.max(3, Math.min(count, ids.length, 6))
  return ids
    .slice(0, clamped)
    .reverse()
    .map((poi_id, i) => ({ poi_id, order: i + 1 }))
}

function mockRoutes(input: RecommendRoutesInput): LLMRouteList {
  const liked = input.likedPoiIds
  // A: 5개 (또는 가능한 만큼) head 순서대로
  const aStops = pickStops(liked, 5)
  // B: 5개 (또는 가능한 만큼) 역순 — 다른 결
  const bStops = pickStopsReversed(liked, 5)
  // C: 3개 — 한 곳 깊게 (적게)
  const cStops = pickStops(liked, 3)

  const routes: LLMRoute[] = [
    {
      letter: 'A',
      name: '둘러보기',
      reason: '천천히 다 가보는 결',
      stops: aStops,
      travelMin: 180,
      moodStars: 4,
      moodLabel: '차분함',
    },
    {
      letter: 'B',
      name: '결 따라',
      reason: '다른 호흡으로 흘러가요',
      stops: bStops,
      travelMin: 200,
      moodStars: 4,
      moodLabel: '들뜸',
    },
    {
      letter: 'C',
      name: '한 곳 깊게',
      reason: '머무는 시간이 길어요',
      stops: cStops,
      travelMin: 120,
      moodStars: 5,
      moodLabel: '침잠',
    },
  ]

  return {
    routes,
    note: '결마다 호흡이 달라요, 골라봐요',
  }
}

// ---------------------------------------------------------------------------
// User prompt 빌드 — likedPoiIds 만 안에서 stops 구성하라 명시
// ---------------------------------------------------------------------------

function buildUserPrompt(input: RecommendRoutesInput): string {
  const tagsLine = input.userStyle.tags.length > 0 ? input.userStyle.tags.join(', ') : '(없음)'
  const likedLines = input.likedPoiIds.map((id) => `- ${id}`).join('\n')

  return `[도시]
${input.city}

[사용자 결 (태그)]
${tagsLine}

[좋아요 POI id list — stops 의 poi_id 는 *반드시 이 id 만* 사용]
${likedLines}

[규칙]
- routes 정확히 3개. letter 는 A, B, C 각 1개씩.
- A 는 둘러보기 결 (stops 3-6, 일반적 흐름).
- B 는 다른 결 (stops 3-6, 같은 POI 라도 다른 순서/조합).
- C 는 한 곳 깊게 결 (stops 3 정도, 머무는 호흡).
- 각 stop 의 poi_id 는 *반드시 위 좋아요 list 의 id 만 사용*. 새 id 생성 X.
- name 5-12자 친구 톤 ("바다 따라" "빵집 도장깨기" "한 곳 깊게" 같은 결).
- reason 15-30자 친구 톤 ("이 흐름 어때?" 같은 호흡. AI 슬롭 X).
- travelMin 60-300 정수 (총 이동시간 분).
- moodStars 1-5 정수.
- order 는 1-based, 각 route 내 방문 순서.
- note 15-30자 친구 톤.`
}

// ---------------------------------------------------------------------------
// LLM function — D22 factory + D2 hallucination guard
// ---------------------------------------------------------------------------

const _recommend = createLLMFunction({
  name: 'recommend_routes',
  description:
    '좋아요 ≥3 POI 를 묶어서 3 갈래 동선 (Plan A/B/C) 을 친구처럼 제시 (SCENARIO 04). stops[].poi_id 는 input.likedPoiIds ⊂ (D2).',
  inputSchema: RecommendRoutesInputSchema,
  outputSchema: LLMRouteListSchema,
  systemPrompt: ROUTES_FRAGMENT,
  buildUserPrompt,
  jsonHintKey: 'routes',
  postValidate: (output, input) => {
    // 1. routes.length === 3 (schema 가 이미 강제하지만 명시적 안전망)
    if (output.routes.length !== 3) {
      return { ok: false, reason: `length=${output.routes.length}` }
    }

    // 2. letter 가 정확히 {A, B, C} (중복/누락 X)
    const letters = output.routes.map((r) => r.letter).sort()
    const expected = ['A', 'B', 'C']
    const lettersOk =
      letters.length === expected.length && letters.every((l, i) => l === expected[i])
    if (!lettersOk) {
      return { ok: false, reason: `letters=${letters.join(',')}` }
    }

    // 3. D2 가장 중요: 모든 stop.poi_id 가 input.likedPoiIds ⊂
    const allowed = new Set(input.likedPoiIds)
    for (const route of output.routes) {
      const invalid = route.stops.filter((s) => !allowed.has(s.poi_id))
      if (invalid.length > 0) {
        return {
          ok: false,
          reason: `hallucination:${invalid.map((s) => s.poi_id).join(',')}`,
        }
      }
    }

    return { ok: true }
  },
  mockFallback: mockRoutes,
})

/**
 * recommendRoutes — D22 패턴 (parse → factory 호출).
 *
 * 입력 검증은 inputSchema 가 처리 (likedPoiIds ≥ 3 강제).
 * 결과의 stops[].poi_id ⊂ likedPoiIds 는 postValidate 가 hallucination 감지.
 */
export async function recommendRoutes(
  input: RecommendRoutesInput,
): Promise<Awaited<ReturnType<typeof _recommend>>> {
  const parsed = RecommendRoutesInputSchema.parse(input)
  return _recommend(parsed)
}

// factory wrapper 도 노출 (eval / test 에서 직접 접근 필요 시)
export const recommendRoutesFactory = _recommend
