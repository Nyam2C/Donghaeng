import { LinearGradient } from 'expo-linear-gradient'
import { useMemo } from 'react'
import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { radius } from '@/theme/spacing'

/**
 * D29 — SCENARIO 04 동선 카드의 미니맵.
 *
 * 명세: "색 그라데이션 + SVG 재구조 · react-native-maps 의존 X · 색으로만 무드 차이 전달"
 * (design-preview line 1799 의 캡션 "미니맵은 색만으로 무드 차이 전달")
 *
 * 결별 색 매핑:
 *  - A 바다 따라         → 청자 그라데이션 (해안선 연상)
 *  - B 빵집 도장깨기     → 황 그라데이션 (구움 색 연상)
 *  - C 한 곳 깊게        → 녹청 그라데이션 (자연 머무름 연상)
 *
 * SVG path 는 letter 별로 다른 곡률 — 동선 결을 흰색 stroke 0.5 opacity 로 흉내.
 * 실제 지도가 아니므로 추상적 결만 전달.
 */

type Letter = 'A' | 'B' | 'C'

type GradientStops = readonly [string, string, string]

const GRADIENTS: Record<Letter, GradientStops> = {
  // 청자 (#4A6FA5 메인) — DESIGN.md 청자 그라데이션 풀
  A: ['#6B89B5', '#4A6FA5', '#2E4E7F'],
  // 황 (#E8B860 amber 풀) — 빵집 결
  B: ['#E8B860', '#C99A40', '#8E6A2A'],
  // 녹청 (#5F8B6E moss 풀) — 자연 결
  C: ['#88B098', '#5F8B6E', '#3A5A4A'],
}

// letter 별 동선 결 path. 24×24 viewBox 안에 그려지고 자식이 % 로 stretch.
//  - A: 완만한 곡선 (해안선 따라가는 결)
//  - B: 지그재그 (도장깨기 — 여러 정류장)
//  - C: 닫힌 작은 원 (한 곳 깊게 — 좁은 영역)
const PATHS: Record<Letter, string> = {
  A: 'M 2 16 Q 8 6, 14 12 T 22 8',
  B: 'M 3 18 L 8 8 L 12 16 L 16 6 L 21 14',
  C: 'M 12 8 Q 18 10, 16 16 Q 10 18, 8 14 Q 6 8, 12 8 Z',
}

interface GradientMiniMapProps {
  letter: Letter
  height?: number
}

export function GradientMiniMap({ letter, height = 96 }: GradientMiniMapProps) {
  const stops = useMemo(() => GRADIENTS[letter], [letter])
  const path = PATHS[letter]

  return (
    <View
      style={{
        width: '100%',
        height,
        borderRadius: radius.card,
        overflow: 'hidden',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <LinearGradient
        colors={[...stops]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: '100%', height: '100%' }}
      />
      {/* SVG path overlay — 24×24 viewBox preserved-aspect 'none' 로 전체 fill */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" viewBox="0 0 24 24" preserveAspectRatio="none">
          <Path
            d={path}
            stroke="#FFFFFF"
            strokeWidth={0.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.55}
          />
        </Svg>
      </View>
    </View>
  )
}
