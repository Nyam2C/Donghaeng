import { LinearGradient } from 'expo-linear-gradient'
import { useMemo } from 'react'
import { View, type ViewStyle } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { radius } from '@/theme/spacing'

/**
 * D29 — SCENARIO 04 동선 카드의 미니맵.
 *
 * 명세 (design-preview line 1799 캡션 + CSS line 437-453 직역):
 *  "색만으로 무드 차이 전달" — SVG Path 곡선 X, 색만으로.
 *
 * 레이아웃:
 *  - height 56 (디자인 spec)
 *  - radius 8 (small) — design-preview .route-map { border-radius: 8px }
 *  - 110deg LinearGradient 3 stop (letter 별)
 *  - radial-gradient 2 광원 overlay (흰빛 0.2 + 0.15)
 *
 * letter 별 색 (design-preview CSS 444-446 그대로):
 *  - A 바다 따라     → 청자 단방향: #4A6FA5 0% / #6B89B5 60% / #88A5D4 100%
 *  - B 빵집 도장깨기 → 녹청→황: #5F8B6E 0% / #88B098 50% / #E8B860 100%
 *  - C 한 곳 깊게    → 주홍→황→청자: #C24A36 0% / #E8B860 50% / #4A6FA5 100%
 *
 * 110deg 방향 → RN LinearGradient start/end 변환:
 *  - CSS 110deg = 위(0deg) 에서 시계방향 110° → end 가 우측-약간아래
 *  - sin(110°) ≈ 0.9397, cos(110°) ≈ -0.3420
 *  - start ≈ (0.03, 0.33), end ≈ (0.97, 0.67)
 */

type Letter = 'A' | 'B' | 'C'

interface GradientSpec {
  colors: readonly [string, string, string]
  locations: readonly [number, number, number]
}

const GRADIENTS: Record<Letter, GradientSpec> = {
  A: { colors: ['#4A6FA5', '#6B89B5', '#88A5D4'], locations: [0, 0.6, 1] },
  B: { colors: ['#5F8B6E', '#88B098', '#E8B860'], locations: [0, 0.5, 1] },
  C: { colors: ['#C24A36', '#E8B860', '#4A6FA5'], locations: [0, 0.5, 1] },
}

// 110deg 변환 — 위 docstring 의 sin/cos 계산값
const GRADIENT_START = { x: 0.03, y: 0.33 } as const
const GRADIENT_END = { x: 0.97, y: 0.67 } as const

interface GradientMiniMapProps {
  letter: Letter
  height?: number
  style?: ViewStyle
}

export function GradientMiniMap({ letter, height = 56, style }: GradientMiniMapProps) {
  const spec = useMemo(() => GRADIENTS[letter], [letter])

  return (
    <View
      style={[
        {
          width: '100%',
          height,
          borderRadius: radius.small,
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <LinearGradient
        colors={[...spec.colors]}
        locations={[...spec.locations]}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={{ width: '100%', height: '100%' }}
      />
      {/* radial 광원 2 개 overlay — design-preview CSS .route-map::before
         radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2), transparent 30%),
         radial-gradient(circle at 70% 70%, rgba(255,255,255,0.15), transparent 25%) */}
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <RadialGradient
              id="glow1"
              cx="30%"
              cy="50%"
              rx="30%"
              ry="30%"
              fx="30%"
              fy="50%"
              gradientUnits="objectBoundingBox"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.2} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient
              id="glow2"
              cx="70%"
              cy="70%"
              rx="25%"
              ry="25%"
              fx="70%"
              fy="70%"
              gradientUnits="objectBoundingBox"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.15} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow1)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow2)" />
        </Svg>
      </View>
    </View>
  )
}
