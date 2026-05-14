import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PoiCuration } from '@/components/poi-curation'
import { TripStart } from '@/components/trip-start'
import { useTrip } from '@/stores/trip'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

import Companion from '../companion'

/**
 * 여행 탭 = 4 모드 state machine (D27).
 *
 * 분기:
 *  (1) active === null            → <TripStart />            (★ TRIP START)
 *  (2) active && step === 'pois'  → <PoiCuration />          (SCENARIO 03)
 *  (3) active && step === 'routes'→ <RouteSelectPlaceholder />(Phase 4b' 임시)
 *  (4) active && step === 'on_trip'(또는 undefined) → <Companion /> (Phase 4c)
 *
 * step undefined 도 'on_trip' 으로 해석 — legacy caller (`startTrip({city,...})` 만 호출하던) 호환.
 *
 * D27 의 mode router 가 가벼운 분기만 담당. companion.tsx 등 기존 산출물 변경 0.
 */

export default function Travel() {
  const active = useTrip((s) => s.active)
  const insets = useSafeAreaInsets()

  if (!active) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: lightColors.bgElev,
          paddingTop: insets.top,
        }}
      >
        <TripStart />
      </View>
    )
  }

  const step = active.planning_step ?? 'on_trip'

  if (step === 'pois') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: lightColors.bgElev,
          paddingTop: insets.top + spacing.sm,
        }}
      >
        <PoiCuration trip={active} />
      </View>
    )
  }

  if (step === 'routes') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: lightColors.bgElev,
          paddingTop: insets.top + spacing.md,
        }}
      >
        <RouteSelectPlaceholder />
      </View>
    )
  }

  // 'on_trip' — 기존 Phase 4c 산출물 재사용
  return <Companion />
}

/**
 * Phase 4b' 까지 임시 — SCENARIO 04 동선 추천 미구현.
 * 친구 톤 voice 1 줄 + 개발용 skip 버튼 (manual UX 테스트 용).
 */
function RouteSelectPlaceholder() {
  const setPlanningStep = useTrip((s) => s.setPlanningStep)
  const endTrip = useTrip((s) => s.endTrip)
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
      }}
    >
      <View
        style={{
          paddingLeft: spacing.md - 4,
          borderLeftWidth: 2,
          borderLeftColor: lightColors.celadon,
          marginBottom: spacing.xl,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 18,
            lineHeight: 18 * 1.4,
            color: lightColors.text,
          }}
        >
          동선 추천은 곧 만나요.
        </Text>
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 14,
            lineHeight: 14 * 1.55,
            color: lightColors.textMuted,
            marginTop: 6,
          }}
        >
          <Text style={{ fontStyle: 'italic', color: lightColors.celadon }}>같이</Text> 만들어가는
          중이에요.
        </Text>
      </View>

      <Pressable
        onPress={() => setPlanningStep('on_trip')}
        accessibilityRole="button"
        accessibilityLabel="ON-TRIP 진입"
        style={({ pressed }) => ({
          alignSelf: 'stretch',
          paddingVertical: spacing.sm + 4,
          borderRadius: radius.cardLarge,
          backgroundColor: lightColors.celadon,
          opacity: pressed ? 0.85 : 1,
          alignItems: 'center',
          marginBottom: spacing.sm,
        })}
      >
        <Text
          style={{
            fontFamily: fonts.family.ui,
            fontSize: 14,
            fontWeight: '500',
            color: lightColors.bgElev,
          }}
        >
          ON-TRIP 진입 (skip)
        </Text>
      </Pressable>

      <Pressable
        onPress={endTrip}
        accessibilityRole="button"
        accessibilityLabel="여행 끝내기"
        style={({ pressed }) => ({
          alignSelf: 'center',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            fontFamily: fonts.family.ui,
            fontSize: 13,
            color: lightColors.textMuted,
          }}
        >
          처음으로
        </Text>
      </Pressable>
    </View>
  )
}
