import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, Pressable, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { InkMark } from '@/components/ink-mark'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius } from '@/theme/spacing'

/**
 * Onboarding — Shell A (docs/design-preview.html SHELL A · line 1412-1428)
 *
 *  - 풀-블리드 그라데이션 (bgElev → celadon 6%)
 *  - 96px 잉크 마크 + mark-enter (scale 0.7→1.05→1.0, 1s cubic-bezier(0.22,1,0.36,1) 0.2s delay)
 *  - 한 문장 헤딩 "처음 만나는 자리. *옆에서, 같이 가요.*" (NotoSerif 26, em italic celadon)
 *  - 본문 (14 textMuted, line-height 1.65, max-width 260)
 *  - 시작하기 CTA (celadon bg, soft pulse)
 *  - "이미 계정이 있어요" 링크 (12 textMuted)
 *
 * Entrance stagger (DESIGN.md 라인 146-160):
 *   mark   0.2s · heading 0.8s · body 1.2s · cta 1.5s · link 1.8s
 *
 * 상호작용:
 *   - "시작하기" → router.replace('/home') (지금은 placeholder, 추후 OAuth 진입)
 *   - "이미 계정이 있어요" → 동일 (추후 sign-in)
 *
 * ReduceMotion: AccessibilityInfo 로 모든 stagger·pulse 비활성, 호흡만 유지.
 */

const CELADON_PULSE = 'rgba(74, 111, 165, 0.10)'
const GRAD_TO = 'rgba(74, 111, 165, 0.06)'

function useFadeUp(delayMs: number, reduceMotion: boolean) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0)
  const translateY = useSharedValue(reduceMotion ? 0 : 14)

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1
      translateY.value = 0
      return
    }
    opacity.value = withDelay(
      delayMs,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
    )
    translateY.value = withDelay(
      delayMs,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) }),
    )
  }, [reduceMotion, delayMs, opacity, translateY])

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))
}

export default function Onboarding() {
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

  // mark-enter: scale 0.7 → 1.05 (0.6s) → 1.0 (0.4s), 0.2s delay
  const markScale = useSharedValue(reduceMotion ? 1 : 0.7)
  const markOpacity = useSharedValue(reduceMotion ? 1 : 0)

  useEffect(() => {
    if (reduceMotion) {
      markScale.value = 1
      markOpacity.value = 1
      return
    }
    const enterEase = Easing.bezier(0.22, 1, 0.36, 1)
    markScale.value = withDelay(
      200,
      withSequence(
        withTiming(1.05, { duration: 600, easing: enterEase }),
        withTiming(1.0, { duration: 400, easing: enterEase }),
      ),
    )
    markOpacity.value = withDelay(200, withTiming(1, { duration: 600, easing: enterEase }))
  }, [reduceMotion, markScale, markOpacity])

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }))

  const headingStyle = useFadeUp(800, reduceMotion)
  const bodyStyle = useFadeUp(1200, reduceMotion)
  const ctaStyle = useFadeUp(1500, reduceMotion)
  const linkStyle = useFadeUp(1800, reduceMotion)

  // CTA soft pulse — opacity ring (box-shadow 대용)
  const pulseScale = useSharedValue(1)
  const pulseOpacity = useSharedValue(0)

  useEffect(() => {
    if (reduceMotion) return
    pulseScale.value = withDelay(
      2500,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.0, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    )
    pulseOpacity.value = withDelay(
      2500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    )
  }, [reduceMotion, pulseScale, pulseOpacity])

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }))

  const handleStart = () => {
    // 추후 OAuth (D18) — 지금은 home 으로 진입
    router.replace('/home')
  }

  return (
    <LinearGradient
      colors={[lightColors.bgElev, GRAD_TO]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 24,
      }}
    >
      {/* 96px 잉크 마크 + mark-enter + breathing (InkMark 내부) */}
      <Animated.View style={[{ marginBottom: 36 }, markStyle]}>
        <InkMark size={96} glow="normal" />
      </Animated.View>

      {/* 헤딩 — "처음 만나는 자리. *옆에서, 같이 가요.*" */}
      <Animated.View style={headingStyle}>
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 26,
            fontWeight: '500',
            lineHeight: 26 * 1.4,
            letterSpacing: -0.52,
            textAlign: 'center',
            color: lightColors.text,
            marginBottom: 14,
          }}
        >
          처음 만나는 자리.{'\n'}
          <Text
            style={{
              fontFamily: fonts.family.numeric,
              fontStyle: 'italic',
              color: lightColors.celadon,
            }}
          >
            옆에서, 같이 가요.
          </Text>
        </Text>
      </Animated.View>

      {/* 본문 */}
      <Animated.View style={[{ maxWidth: 260, marginBottom: 40 }, bodyStyle]}>
        <Text
          style={{
            fontFamily: fonts.family.ui,
            fontSize: 14,
            color: lightColors.textMuted,
            lineHeight: 14 * 1.65,
            textAlign: 'center',
          }}
        >
          동행은 윤서님 옆에서 같이 여행을 짜고, 또 같이 다닐 거예요. 시작해볼까요?
        </Text>
      </Animated.View>

      {/* CTA "시작하기" — soft pulse ring + button */}
      <Animated.View style={[{ width: '100%', maxWidth: 260, marginBottom: 16 }, ctaStyle]}>
        <View style={{ position: 'relative' }}>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                inset: 0,
                borderRadius: radius.cardLarge,
                backgroundColor: CELADON_PULSE,
              },
              pulseStyle,
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="시작하기"
            onPress={handleStart}
            style={({ pressed }) => ({
              backgroundColor: lightColors.celadon,
              borderRadius: radius.cardLarge,
              paddingVertical: 15,
              alignItems: 'center',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text
              style={{
                fontFamily: fonts.family.ui,
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: '500',
              }}
            >
              시작하기
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* 링크 "이미 계정이 있어요" */}
      <Animated.View style={linkStyle}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="이미 계정이 있어요"
          onPress={handleStart}
          hitSlop={10}
        >
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: 12,
              color: lightColors.textMuted,
            }}
          >
            이미 계정이 있어요
          </Text>
        </Pressable>
      </Animated.View>
    </LinearGradient>
  )
}
