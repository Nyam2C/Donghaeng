# 동행 · AGENTS — LLM 함수 카탈로그

> **비전 (D22 + D23)**
> **OSS = 에이전트 오케스트레이션 패턴.** 모델은 Claude (D9-b reaffirm).
> *LLM 호출 1번 = 함수 1개.* TypeScript + zod + factory + Anthropic function calling 호환 spec + promptfoo eval.

이 문서는 사람이 읽는 source-of-truth. 코드 source-of-truth 는 `backend/server/llm/`.

---

## 패턴 (3줄 요약)

1. `createLLMFunction<I, O>({ name, systemPrompt, inputSchema, outputSchema, postValidate?, mockFallback, ... })` 으로 함수 1개 정의.
2. factory 가 zod 입출력 검증 + JSON schema 강제 prompt + retry + mockFallback 까지 책임.
3. Hono route 는 `recommendCities(body)` / `recommendPois(body)` 호출만. SSE wire format 동일 (`event: start → raw → final → done`).

```ts
import { recommendCities } from '@/llm/functions/recommend-cities'

const { result, hallucinationDetected, trace } = await recommendCities({
  userStyle: { tags: ['야경/야간', '맛집은 꼭'], likedPoiIds: [], dislikedPoiIds: [] },
  utterance: '',
})
// result: LLMCityRecommendation { cities: [4], note }
// hallucinationDetected: cities[].name 이 KOREAN_CITY_WHITELIST 밖이면 true
```

---

## 카탈로그 (총 8 — Phase 3.5 기준 2 라이브, 6 plan)

| # | name | 단계 | 입력 | 출력 | hallucination guard | 상태 |
|---|------|------|------|------|---------------------|------|
| 1 | `recommend_cities` | Phase 3 SCENARIO 02 | `RecommendCitiesInput` (결 태그 + 자유 발화) | `LLMCityRecommendation` (4 도시) | `cities[].name ⊂ KOREAN_CITY_WHITELIST` + `length === 4` | **라이브** |
| 2 | `recommend_pois` | Phase 3 SCENARIO 03+ | `RecommendPoisInput` (후보 POI list) | `LLMRecommendation` (recommended_ids ≤ 3) | `recommended_ids ⊂ candidatePois.id` (D2) | **라이브** |
| 3 | `extract_intent` | Phase 5a | 사용자 발화 텍스트 | `IntentExtraction { intent, confidence }` | `confidence < 0.7 → 'unknown'` | Phase 5a |
| 4 | `compose_card` | Phase 4 | POI + 결 + 날씨 | `MomentCard` | 카드 type whitelist | Phase 4 |
| 5 | `compose_voice_note` | Phase 4 | 결 + 카드 + 시점 | `{ note: string }` 친구 톤 | 길이 + 격식 표현 차단 | Phase 4 |
| 6 | `rescue_pivot` | Phase 5b | 현 위치 + 알림 | `{ alternatives: KakaoPOI[], note }` | POI id whitelist | Phase 5b |
| 7 | `compose_diary_summary` | Phase 6 | Turn[] + 카드 | `{ summary, voiceQuotes[] }` | 카드 + Turn 인용만 | Phase 6 |
| 8 | `prosody_hint` | Phase 5a (TTS) | 친구 톤 text | `{ pauses[], emphasis[] }` | char index ⊂ text | Phase 5a |

---

## 페르소나 fragment

`backend/server/llm/prompts.ts` 의 단일 source-of-truth. 모든 함수가 `BASE_PERSONA` 상속 후 함수별 fragment 추가.

```ts
export const BASE_PERSONA = `너는 윤서의 여행 친구. 차분하고 알아채는, 호흡 같은 결.
반말 또는 친근체. 어색한 격식 X. AI 슬롭 X — 사람이 친구에게 말하듯.`
```

함수별 fragment:
- `CITY_FRAGMENT` — 큰 그림, 신중한 톤, reason 12-25자 / note 15-30자.
- `POI_FRAGMENT` — 후보 id 만 사용 (절대 새 id X), note 15-30자.

---

## AI 슬롭 A 등급 baseline (Phase 3 실응답)

```
결: [야경/야간, 맛집은 꼭] · 발화 ""
→ recommend_cities 결과:
{
  "cities": [
    { "name": "부산", "reason": "회 한 점 캬, 야경도 한가득", "match": 95 },
    { "name": "여수", "reason": "밤바다 빛 + 게장은 진리", "match": 90 },
    { "name": "전주", "reason": "한옥 골목 + 야시장", "match": 82 },
    { "name": "강릉", "reason": "조용한 결, 다른 결도 한 곳", "match": 70 }
  ],
  "note": "비슷한 결 둘, 다른 결 둘로 섞었어요."
}
```

이게 친구 톤 A 등급 baseline. promptfoo eval 의 `not-contains-any` assertion 으로 회귀 막는다 (격식 표현 `'추천드립니다'`, `'입니다'`, `'습니다'` 차단).

---

## D 결정 reference

- **D2** — JSON schema + recommended_ids ⊂ candidatePois.id (POI hallucination guard)
- **D9-b** — Bun.spawn(['claude', ...]) host ~/.claude bind mount (Anthropic SDK 직접 호출 X)
- **D21** — 도시 추천 + KOREAN_CITY_WHITELIST (D2 정신 도시명에 적용)
- **D22** — OSS 에이전트 오케스트레이션 패턴 정립 (Phase 3.5)
- **D23** — Claude 모델 그대로 (모델 교체 X, 패턴 정립만)

---

## 추후 확장 가이드

새 LLM 함수 1개 추가 절차:

1. `shared/types/src/agent.ts` 에 zod schema 추가 (`{Name}InputSchema`, `{Name}OutputSchema`)
2. `shared/types/src/llm.ts` (또는 적절 위치) 에 동일 shape 의 interface 미러 (frontend `import type` 안전)
3. `backend/server/llm/prompts.ts` 에 fragment 추가
4. `backend/server/llm/functions/{name}.ts` 생성 — `createLLMFunction({...})` 한 번 호출
5. (필요시) Hono route 에서 `await {name}(body)` 호출
6. `backend/server/eval/{name}.eval.ts` 추가 — 10 케이스 + 친구 톤 assertion
