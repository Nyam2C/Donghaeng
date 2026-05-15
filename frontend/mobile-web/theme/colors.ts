/**
 * 동행 디자인 시스템 — Color (DESIGN.md 11-115줄)
 *
 * 사용 규칙:
 *  1. 주홍(juhong) 은 *희소*. 예약 확정/"됐다" 순간만. 한 화면 2곳 금지
 *  2. 황색(amber) 은 주의/돌발변수만
 *  3. 녹청(moss) 은 자연/야외/success
 *  4. 청자(celadon) 가 메인. 컴패니언 존재, CTA, 활성 탭, 강조어
 *
 * Day 2a · Phase 1 — 이 파일은 freeze. 이후 phase에서 직접 수정 금지
 */

export const light = {
  // Surface
  bg: '#F5EFE3', // 한지 배경
  bgElev: '#FFFFFF', // 카드 · 시트
  // Text
  text: '#1F1F1F', // 먹색 본문
  textMuted: '#6B6258', // 보조
  textSoft: '#7A7065', // 캡션 · 플레이스홀더 (WCAG AA 4.8:1)
  // Accent (★ 메인)
  celadon: '#4A6FA5', // 메인 액센트 · 청자
  celadonSoft: '#6B89B5',
  celadonDeep: '#2E4E7F',
  celadonTint: 'rgba(74, 111, 165, 0.08)', // selected 카드 fill · design-preview --celadon-tint
  // 보조 액센트 (희소 ↓)
  moss: '#5F8B6E', // 자연 · success
  amber: '#E8B860', // 주의 · 돌발변수
  amberTint: 'rgba(232, 184, 96, 0.10)', // 비 day 카드 fill · design-preview line 2361
  amberTintSoft: 'rgba(232, 184, 96, 0.06)', // 비 안내 카드 bg · design-preview line 2375
  amberTextDeep: '#8E6A2A', // 비 day text · design-preview line 2363 + 2377 그대로
  juhong: '#C24A36', // ★ 희소 강조 (확정)
  // Line
  line: '#D9CFC1',
  lineSoft: '#E8E0D2',
  lineStrong: 'rgba(31, 31, 31, 0.15)', // 사용자 발화 좌보더 · design-preview --line-strong
} as const

export const dark = {
  // Surface (해질녘 직후)
  bg: '#1A1F2A',
  bgElev: '#232938',
  // Text
  text: '#F5EFE3',
  textMuted: '#B8B0A5',
  textSoft: '#9A9085',
  // Accent
  celadon: '#88A5D4',
  celadonSoft: '#6B89B5',
  celadonDeep: '#5778AE',
  celadonTint: 'rgba(136, 165, 212, 0.10)', // selected 카드 fill · design-preview dark --celadon-tint
  // 보조
  moss: '#88B098',
  amber: '#E8C680',
  amberTint: 'rgba(232, 198, 128, 0.12)',
  amberTintSoft: 'rgba(232, 198, 128, 0.08)',
  amberTextDeep: '#E8C680', // dark theme 에선 amber 톤 그대로 (텍스트 contrast 충분)
  juhong: '#E3725E',
  // Line
  line: '#3A4150',
  lineSoft: '#2D3340',
  lineStrong: 'rgba(245, 239, 227, 0.18)', // dark theme: text 색 baseline 의 alpha
} as const

export type ColorScheme = typeof light
