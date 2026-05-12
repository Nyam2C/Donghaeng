/**
 * API 클라이언트 (D13 — mock layer toggle)
 *
 * USE_MOCKS=true 일 때: __mocks__/api/<path>.json fixture 응답
 * USE_MOCKS=false 일 때: server (Hono, port 3000) HTTP 호출
 *
 * Phase 1 Day 3 freeze. 시그니처 변경 X (D12)
 */

// Static fixture registry (Metro bundler 가 dynamic template-literal import 처리 못함)
// Phase 2-5 에서 새 mock 추가 시 이 map 에 entry 박음
const MOCK_REGISTRY: Record<string, unknown> = {
  '/llm': require('./__mocks__/api/llm.json'),
  '/intent/show-map': require('./__mocks__/api/intent/show-map.json'),
  '/intent/show-card': require('./__mocks__/api/intent/show-card.json'),
  '/intent/continue': require('./__mocks__/api/intent/continue.json'),
  '/intent/rescue': require('./__mocks__/api/intent/rescue.json'),
  '/poi/search': require('./__mocks__/api/poi/search.json'),
  '/poi/nearby': require('./__mocks__/api/poi/nearby.json'),
  '/weather': require('./__mocks__/api/weather.json'),
}

export const apiBaseUrl: string = process.env.EXPO_PUBLIC_API ?? 'http://localhost:3000'

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true'

/**
 * path 에서 query string 제거 — fixture lookup key 는 path 만 (`/poi/search?q=...` → `/poi/search`)
 */
function normalizePath(path: string): string {
  const qIdx = path.indexOf('?')
  return qIdx === -1 ? path : path.slice(0, qIdx)
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (USE_MOCKS) {
    const key = normalizePath(path)
    const fixture = MOCK_REGISTRY[key]
    if (!fixture) {
      throw new Error(`Mock fixture not registered: ${key}. Add to MOCK_REGISTRY in api-client.ts`)
    }
    await new Promise((r) => setTimeout(r, 200))
    return fixture as T
  }
  const res = await fetch(apiBaseUrl + path, init)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}
