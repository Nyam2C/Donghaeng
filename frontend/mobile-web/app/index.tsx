import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { InkMark } from '@/components/ink-mark'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius } from '@/theme/spacing'

/**
 * Onboarding — Shell A (docs/design-preview.html SHELL A · line 1412-1428)
 *
 * 단순화 버전: Animated.View · LinearGradient 제거. web 첫 진입 빈 화면 회피.
 * 그라데이션 + entrance 애니메이션은 디바이스 동작 확인 후 다시 추가.
 *
 * 상호작용:
 *   - "시작하기" → router.replace('/home')
 *   - "이미 계정이 있어요" → 동일 (추후 sign-in)
 */
export default function Onboarding() {
  const handleStart = () => {
    router.replace('/home')
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: lightColors.bgElev,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 24,
      }}
    >
      {/* 96px 잉크 마크 */}
      <View style={{ marginBottom: 36 }}>
        <InkMark size={96} glow="normal" />
      </View>

      {/* 헤딩 — "처음 만나는 자리. 옆에서, 같이 가요." */}
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

      {/* 본문 */}
      <View style={{ maxWidth: 260, marginBottom: 40 }}>
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
      </View>

      {/* CTA "시작하기" */}
      <View style={{ width: '100%', maxWidth: 260, marginBottom: 16 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="시작하기"
          onPress={handleStart}
          style={({ pressed }) => ({
            backgroundColor: lightColors.celadon,
            borderRadius: radius.cardLarge,
            paddingVertical: 15,
            alignItems: 'center',
            opacity: pressed ? 0.92 : 1,
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

      {/* 링크 "이미 계정이 있어요" */}
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
    </View>
  )
}
