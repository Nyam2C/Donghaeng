import { useEffect, useState } from 'react'
import { AccessibilityInfo, View, useColorScheme } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Ellipse } from 'react-native-svg'

import type { Glow } from '@trip/types'

import { darkColors, lightColors } from '@/theme'

/**
 * InkMark — 동행 컴패니언 잉크 마크 (DESIGN.md 라인 170-174 · logo.svg 형상)
 *
 *  - 4초 호흡 사이클 (scale 1.0 ↔ 1.04 · opacity 0.94 ↔ 1.0)
 *  - ReduceMotion 활성화 시 정지 (AccessibilityInfo listener)
 *  - glow: Phase 2 엔 normal 처럼 렌더 (색 변환은 Phase 4-5 확장)
 *
 * 시그니처: stub freeze (size · glow required). breathing 토글은 ReduceMotion 으로만.
 */
export interface InkMarkProps {
  size: number
  glow: Glow
}

const glowToColor = (glow: Glow, isDark: boolean): string => {
  // Phase 2: 모든 glow 를 celadon 으로 (state machine 확장은 Phase 4-5)
  // 시그니처 호환을 위해 glow 인자는 받기만 함
  void glow
  return isDark ? darkColors.celadon : lightColors.celadon
}

export function InkMark({ size, glow }: InkMarkProps) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const fill = glowToColor(glow, isDark)

  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v)
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      setReduceMotion(v)
    })
    return () => {
      mounted = false
      sub.remove()
    }
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1
      opacity.value = 1
      return
    }
    // 4초 사이클: 2s up + 2s down
    const ease = Easing.inOut(Easing.quad)
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 2000, easing: ease }),
        withTiming(1.0, { duration: 2000, easing: ease }),
      ),
      -1,
      false,
    )
    opacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 2000, easing: ease }),
        withTiming(0.94, { duration: 2000, easing: ease }),
      ),
      -1,
      false,
    )
  }, [reduceMotion, scale, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 70">
          {/* logo.svg 5 element 그대로 */}
          <Ellipse cx={38} cy={36} rx={18} ry={17} fill={fill} opacity={0.92} />
          <Ellipse cx={32} cy={30} rx={6} ry={5} fill={fill} opacity={0.42} />
          <Circle cx={44} cy={40} r={3} fill={fill} opacity={0.55} />
          <Circle cx={74} cy={40} r={10} fill={fill} opacity={0.88} />
          <Circle cx={72} cy={37} r={3} fill={fill} opacity={0.42} />
        </Svg>
      </Animated.View>
    </View>
  )
}
