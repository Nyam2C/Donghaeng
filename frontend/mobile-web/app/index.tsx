import { router } from 'expo-router'
import { Platform, Pressable, Text, View } from 'react-native'

import { InkMark } from '@/components/ink-mark'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius } from '@/theme/spacing'

/**
 * Onboarding — Shell A (docs/design-preview.html SHELL A · line 1412-1428)
 *
 *  - 96px 잉크 마크 + mark-enter (scale 0.7→1.05→1.0) + breathe-lg
 *  - 헤딩 "처음 만나는 자리. 옆에서, 같이 가요." (NotoSerif 26, em italic celadon)
 *  - 본문 (Pretendard 14 textMuted, max-width 260)
 *  - CTA "시작하기" (celadon bg, soft pulse) — 추후 OAuth 진입
 *  - "이미 계정이 있어요" 링크 (12 textMuted)
 *
 * Entrance (web): app/+html.tsx 의 @keyframes (CSS) 로 진짜 동작.
 *                 reanimated 의 web stuck 회피.
 * Entrance (native): 추후 Expo Go 검증 단계에서 reanimated 다시 추가 가능.
 *
 * 로그인 전 톤: 사용자 이름 X. 추후 OAuth 후 "{name}님 옆에서" 로 교체.
 */

// RN-web 의 CSS animation 지원 (Platform.OS === 'web' 만 적용)
const webAnim = (animation: string) =>
  Platform.OS === 'web' ? ({ animation } as unknown as object) : undefined

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
      {/* 96px 잉크 마크 — mark-enter 0.2s + breathe-lg 1.4s infinite */}
      <View
        className="onboard-mark"
        style={[
          { marginBottom: 36 },
          webAnim(
            'onboard-mark-enter 1s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both, onboard-breathe-lg 3s ease-in-out 1.4s infinite',
          ),
        ]}
      >
        <InkMark size={96} glow="normal" />
      </View>

      {/* 헤딩 — fade-up 0.8s */}
      <View className="onboard-heading" style={webAnim('onboard-fade-up 0.8s ease-out 0.8s both')}>
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
      </View>

      {/* 본문 — fade-up 1.2s */}
      <View
        className="onboard-body"
        style={[
          { maxWidth: 260, marginBottom: 40 },
          webAnim('onboard-fade-up 0.7s ease-out 1.2s both'),
        ]}
      >
        <Text
          style={{
            fontFamily: fonts.family.ui,
            fontSize: 14,
            color: lightColors.textMuted,
            lineHeight: 14 * 1.65,
            textAlign: 'center',
          }}
        >
          동행이 옆에서 같이 짜고, 같이 다녀줄 거예요. 시작해볼까요?
        </Text>
      </View>

      {/* CTA — fade-up 1.5s + soft-pulse 3.2s infinite (2.5s delay) */}
      <View
        className="onboard-cta"
        style={[
          { width: '100%', maxWidth: 260, marginBottom: 16 },
          webAnim(
            'onboard-fade-up 0.7s ease-out 1.5s both, onboard-cta-pulse 3.2s ease-in-out 2.5s infinite',
          ),
        ]}
      >
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

      {/* 링크 — fade-up 1.8s */}
      <View className="onboard-link" style={webAnim('onboard-fade-up 0.6s ease-out 1.8s both')}>
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
    </View>
  )
}
