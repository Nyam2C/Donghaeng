import { Redirect, router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'

import { InkMark } from '@/components/ink-mark'
import { useSession } from '@/stores/session'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius } from '@/theme/spacing'

/**
 * Onboarding — ★ v1.5 SCENARIO 00 (design-preview line 2300-2338 직역 · D36)
 *
 *  - 중앙 80x80 잉크 마크 (breathing) + Noto Serif 24 "옆에서 같이 짜볼게요"
 *  - 권한 카드 2개 (위치 · 알림) — "선택" 라벨 (강제 X · D15 권한 prompt 코드 X)
 *  - 마이크 X (D32 채팅 first 일관)
 *  - "시작할게요" CTA → useSession.setOnboarded(true) → /(tabs)/home
 *  - 탭바 없음 (D36) — app/index.tsx 는 (tabs)/_layout 바깥
 *  - AsyncStorage persist → 재실행 시 onboarded=true 면 즉시 home redirect
 */

// design-preview line 2333: "권한은 나중에 바꿔도 돼요"
const PERMISSION_HINT = '권한은 나중에 바꿔도 돼요'

function PinIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s-7-7-7-13a7 7 0 1 1 14 0c0 6-7 13-7 13z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={12}
        cy={9}
        r={2.5}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function BellIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 21a2 2 0 0 0 4 0"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

interface PermissionCardProps {
  icon: 'pin' | 'bell'
  title: string
  meta: string
  accessibilityLabel: string
}

function PermissionCard({ icon, title, meta, accessibilityLabel }: PermissionCardProps) {
  const IconCmp = icon === 'pin' ? PinIcon : BellIcon
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        // D15: 권한 prompt 코드 박지 않음. 카드는 visual + 진입점만.
        // 실제 권한 요청은 expo-location/expo-notifications 사용 시점에서 처리.
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: lightColors.line,
        borderRadius: radius.card,
        backgroundColor: lightColors.bgElev,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: lightColors.celadonTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconCmp size={16} color={lightColors.celadon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 14,
            fontWeight: '500',
            color: lightColors.text,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 11,
            color: lightColors.textMuted,
            fontStyle: 'italic',
            marginTop: 2,
          }}
        >
          {meta}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: fonts.family.mono,
          fontSize: 11,
          color: lightColors.textSoft,
        }}
      >
        선택
      </Text>
    </Pressable>
  )
}

export default function Onboarding() {
  const insets = useSafeAreaInsets()
  const onboarded = useSession((s) => s.onboarded)
  const setOnboarded = useSession((s) => s.setOnboarded)

  // 재실행 시 onboarded=true 면 즉시 home redirect — `<Redirect />` 는 declarative 라서
  // Root Layout mount 완료 후 navigation tree ready 상태에서만 실행됨. useEffect + router.replace
  // 는 mount 직후 race ("Attempted to navigate before mounting the Root Layout") 발생 가능.
  if (onboarded === true) return <Redirect href="/(tabs)/home" />

  const handleStart = () => {
    setOnboarded(true)
    // 사용자 click 이후 호출 — mount 끝난 상태라 imperative router.replace 안전.
    router.replace('/(tabs)/home')
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: lightColors.bgElev,
        paddingTop: Math.max(insets.top, 48),
        paddingBottom: Math.max(insets.bottom, 32),
        paddingHorizontal: 28,
      }}
    >
      {/* Section 1 — 중앙 잉크 마크 + heading */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <InkMark size={80} glow="normal" />
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 24,
              fontWeight: '500',
              lineHeight: 24 * 1.45,
              color: lightColors.text,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            옆에서 같이{'\n'}
            <Text
              style={{
                fontFamily: fonts.family.numeric,
                fontStyle: 'italic',
                color: lightColors.celadon,
              }}
            >
              짜볼게요
            </Text>
          </Text>
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 14,
              lineHeight: 14 * 1.6,
              color: lightColors.textMuted,
              textAlign: 'center',
            }}
          >
            친구가 옆에서 같이 여행 짜주는 결.{'\n'}음성 X. 텍스트로 천천히.
          </Text>
        </View>
      </View>

      {/* Section 2 — 권한 카드 2개 */}
      <View style={{ gap: 10, marginBottom: 24 }}>
        <PermissionCard
          icon="pin"
          title="위치"
          meta={'"근처에 어울리는 곳" 추천에 쓸게요'}
          accessibilityLabel="위치 권한 안내"
        />
        <PermissionCard
          icon="bell"
          title="알림"
          meta={'"비 와요" 같은 작은 알림만'}
          accessibilityLabel="알림 권한 안내"
        />
      </View>

      {/* Section 3 — CTA + 안내 */}
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="시작할게요"
          onPress={handleStart}
          style={({ pressed }) => ({
            paddingVertical: 14,
            paddingHorizontal: 22,
            backgroundColor: lightColors.celadon,
            borderRadius: radius.cardLarge,
            alignItems: 'center',
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 15,
              fontWeight: '500',
              color: lightColors.bgElev,
            }}
          >
            시작할게요
          </Text>
        </Pressable>
        <Text
          style={{
            marginTop: 14,
            fontFamily: fonts.family.voice,
            fontSize: 12,
            fontStyle: 'italic',
            color: lightColors.textSoft,
            textAlign: 'center',
          }}
        >
          {PERMISSION_HINT}
        </Text>
      </View>
    </View>
  )
}
