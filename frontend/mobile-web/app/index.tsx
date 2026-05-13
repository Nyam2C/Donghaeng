import { Redirect } from 'expo-router'

/**
 * Root entry — Expo Router 의 / 매핑 (D16 · Phase 1 scaffold 보강)
 *
 * Phase 1 Day 3 scaffold 시점에 누락된 entry. Phase 2 dev:web 검증 시
 * "Unmatched Route" 발견 → / 가 (tabs)/home 으로 redirect 되도록 추가.
 * 시그니처 영향 X, frozen 영역 새 파일 1.
 */
export default function Index() {
  return <Redirect href="/home" />
}
