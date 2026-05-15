// Phase 5b (D34) — updateRoute LLM function
//
// SCENARIO 08: 현재 동선에 사용자가 새 장소 추가 요청 → 동선 재계산.
// 입력: currentRoute + addRequest (사용자 발화) + city + userStyle.
// 출력: { route: LLMRoute, addedStopName?, note } — 갱신된 동선 + 친구 톤 약속.
// D22 factory 패턴.

import type { LLMRouteUpdate } from '@trip/types'
import { createLLMFunction } from '../factory'
import { UPDATE_ROUTE_FRAGMENT } from '../prompts'
import { LLMRouteUpdateSchema, type UpdateRouteInput, UpdateRouteInputSchema } from '../schemas'

// ---------------------------------------------------------------------------
// User prompt 빌드 — 현재 동선 + 추가 요청
// ---------------------------------------------------------------------------

function buildUserPrompt(input: UpdateRouteInput): string {
  const stopsLine = [...input.currentRoute.stops]
    .sort((a, b) => a.order - b.order)
    .map((s) => `${s.order}. ${s.poi_id}`)
    .join('\n')

  const moodLine = input.currentRoute.moodLabel
    ? `, moodLabel="${input.currentRoute.moodLabel}"`
    : ''

  const tagsLine = input.userStyle.tags.length > 0 ? input.userStyle.tags.join(', ') : '(없음)'

  return `[도시]
${input.city}

[사용자 결]
${tagsLine}

[현재 동선 — Plan ${input.currentRoute.letter} "${input.currentRoute.name}"]
${stopsLine}
travelMin=${input.currentRoute.travelMin}, moodStars=${input.currentRoute.moodStars}${moodLine}

[사용자 추가 요청]
"${input.addRequest}"

[규칙]
- 기존 stops 유지 + 새 stop 을 자연스러운 위치에 추가 (order 재정렬).
- 새 stop 의 poi_id 는 사용자 장소명 한국어 그대로 (Kakao id 없음 — 친구의 어림).
- travelMin +20~+45 자연 증가.
- moodStars 그대로 유지. moodLabel 유지 또는 살짝 조정.
- letter / name / reason 그대로.
- addedStopName 은 사용자 발화의 장소명.
- note 친구 톤 15-30자 ("이렇게 어때?" "끼워볼게요" 톤).
- JSON 만 반환.`
}

// ---------------------------------------------------------------------------
// Mock fallback — 시드 없이 결정적. 사용자 발화에서 장소명 추출 후 끝에 추가.
// ---------------------------------------------------------------------------

/** "HH:MM" 에 시간 더해서 "HH:MM" 반환 (24시간 wrap). 1자리 수도 2자리로 pad. */
function addHours(hhmm: string, hours: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  const newH = (h + hours) % 24
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** "정동진도 가고 싶어" → "정동진". 조사 제거. */
function extractAddedName(addRequest: string): string {
  const withParticle = addRequest.match(/([가-힣A-Za-z]{2,12})(?:도|를|을|에|이|은)/)
  if (withParticle) return withParticle[1]
  const noun = addRequest.match(/([가-힣]{2,8})/)
  return noun?.[1] ?? '새 장소'
}

function mockUpdate(input: UpdateRouteInput): LLMRouteUpdate {
  const addedName = extractAddedName(input.addRequest)
  const maxOrder = input.currentRoute.stops.reduce((m, s) => Math.max(m, s.order), 0)
  // D38 — 추가된 stop 에도 timeHint + name 채움 (편지 일정 SPECIAL v1.6).
  // 시간은 기존 마지막 timeHint 뒤 2시간 (간단 heuristic).
  const lastTime = [...input.currentRoute.stops]
    .sort((a, b) => a.order - b.order)
    .reverse()
    .find((s) => s.timeHint)?.timeHint
  const newTimeHint = lastTime ? addHours(lastTime, 2) : '17:00'
  const newStops = [
    ...input.currentRoute.stops,
    {
      poi_id: addedName,
      order: maxOrder + 1,
      name: addedName,
      timeHint: newTimeHint,
    },
  ]

  // travelMin +30 (clamp 720)
  const newTravelMin = Math.min(720, input.currentRoute.travelMin + 30)

  return {
    route: {
      letter: input.currentRoute.letter,
      name: input.currentRoute.name,
      reason: input.currentRoute.reason,
      stops: newStops,
      travelMin: newTravelMin,
      moodStars: input.currentRoute.moodStars,
      ...(input.currentRoute.moodLabel ? { moodLabel: input.currentRoute.moodLabel } : {}),
    },
    addedStopName: addedName,
    note: `${addedName} 끼워볼게요. 이대로 어때?`,
  }
}

// ---------------------------------------------------------------------------
// LLM function — D22 factory
// ---------------------------------------------------------------------------

const _update = createLLMFunction({
  name: 'update_route',
  description: '현재 동선에 사용자 요청 stop 추가 → 동선 재계산 (D34 SCENARIO 08).',
  inputSchema: UpdateRouteInputSchema,
  outputSchema: LLMRouteUpdateSchema,
  systemPrompt: UPDATE_ROUTE_FRAGMENT,
  buildUserPrompt,
  jsonHintKey: 'route',
  postValidate: (output, input) => {
    // stops 의 letter 가 그대로 유지되는지 (factory 가 schema 통과 후)
    if (output.route.letter !== input.currentRoute.letter) {
      return {
        ok: false,
        reason: `letter changed: ${input.currentRoute.letter} → ${output.route.letter}`,
      }
    }
    // stops 가 input.currentRoute.stops 보다 ≥ 1개 늘었는지 (추가 의미 보장)
    if (output.route.stops.length < input.currentRoute.stops.length + 1) {
      return {
        ok: false,
        reason: `stops not added: ${input.currentRoute.stops.length} → ${output.route.stops.length}`,
      }
    }
    return { ok: true }
  },
  mockFallback: mockUpdate,
})

/**
 * updateRoute — D22 패턴 (parse → factory 호출).
 *
 * 입력 검증은 inputSchema 가 처리 (addRequest 1-200자, currentRoute schema).
 * stops 늘었는지·letter 유지인지는 postValidate 가 검증.
 */
export async function updateRoute(
  input: UpdateRouteInput,
): Promise<Awaited<ReturnType<typeof _update>>> {
  const parsed = UpdateRouteInputSchema.parse(input)
  return _update(parsed)
}

// factory wrapper 도 노출 (eval / test 에서 직접 접근 필요 시)
export const updateRouteFactory = _update
