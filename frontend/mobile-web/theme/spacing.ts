/**
 * 동행 디자인 시스템 — Spacing & Radius (DESIGN.md 120-134줄)
 *
 * Base 4px · Scale 2·4·8·16·24·32·48·64·96
 * Density: Comfortable → Spacious (의도적 호흡)
 * 음성 모먼트 위/아래: 64-96px
 *
 * Day 2a · Phase 1 — freeze
 */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
} as const

/**
 * Border radius (DESIGN.md 134줄)
 *  - 8  : 작음 (chip, tag)
 *  - 12 : 카드
 *  - 14 : 큰 카드
 *  - 16 : 모먼트 카드
 *  - 20 : 시트 (bottom-sheet 상단)
 *  - 999: pill (CTA, badge)
 *
 * ★ 18px+ "거품 radius" 금지 (DESIGN.md anti-pattern)
 */
export const radius = {
  small: 8,
  card: 12,
  cardLarge: 14,
  moment: 16,
  sheet: 20,
  pill: 999,
} as const

/**
 * Stroke (icon, divider)
 */
export const stroke = {
  icon: 1.6, // SVG line-art (DESIGN.md 203줄)
  line: 1, // divider, border
  voiceBorder: 2, // 음성 인용 좌측 청자 보더
} as const

export type Spacing = keyof typeof spacing
export type Radius = keyof typeof radius
