# Mock fixtures (D13)

`EXPO_PUBLIC_USE_MOCKS=true` 일 때 `services/api-client.ts` 가 이 폴더에서
`api{path}.json` 을 동적 import. backend 없이 Phase 2-5 frontend 가 화면을 채울 때 사용.

## 경로 매핑

| path | fixture |
|---|---|
| `/api/llm` | `api/llm.json` |
| `/api/intent/show-map` | `api/intent/show-map.json` |
| `/api/intent/show-card` | `api/intent/show-card.json` |
| `/api/intent/continue` | `api/intent/continue.json` |
| `/api/intent/rescue` | `api/intent/rescue.json` |
| `/api/poi/search` | `api/poi/search.json` |
| `/api/poi/nearby` | `api/poi/nearby.json` |
| `/api/weather` | `api/weather.json` |

## TTS 음성 (skip)

`/api/tts-proxy` 는 binary stream (audio/mpeg) 이라 JSON fixture 못 만듦.
Phase 5 에서 ai-tts:8000 (edge-tts) 직접 띄워서 dev 환경에서 테스트.
