/**
 * 동행 디자인 시스템 — Typography (DESIGN.md 48-77줄)
 *
 * 4 패밀리 · 각 역할 분리:
 *  - Pretendard       UI · 본문 · 버튼 (한국 표준 humane sans)
 *  - Noto Serif KR    Voice · 컴패니언 발화 · 한글 헤딩 ("말하는 사람")
 *  - Fraunces italic  Latin · 숫자 강조 ("사람이 적어준" 숫자)
 *  - DM Mono          Data · 시간 · tabular ("정확함")
 *
 * 금지: Inter · Roboto · Space Grotesk
 *
 * Day 2a · Phase 1 — freeze
 */

export const family = {
  ui: 'Pretendard', // 본문 · UI · 버튼
  voice: 'NotoSerifKR', // 컴패니언 발화 · 한글 헤딩
  numeric: 'Fraunces-Italic', // Latin · 숫자 강조
  mono: 'DMMono', // 데이터 · 시간
} as const

/**
 * 스케일 (모바일 기준, DESIGN.md 66-75줄)
 */
export const size = {
  display: 36, // 32-44 range
  h1: 22, // voice heading
  h2: 18,
  body: 14,
  bodyLarge: 15,
  caption: 12,
  data: 13,
  numericAccent: 24, // 18-32 range
} as const

/**
 * Line height (한국어 + 의도적 호흡)
 * 본문 1.5, voice 1.4 (편지 결), data 1.2 (밀집)
 */
export const lineHeight = {
  display: 1.2,
  h1: 1.4,
  h2: 1.4,
  body: 1.5,
  voice: 1.4,
  caption: 1.4,
  data: 1.2,
} as const

/**
 * Weight
 */
export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
} as const

export type FontFamily = (typeof family)[keyof typeof family]
