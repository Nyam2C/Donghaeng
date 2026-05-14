import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { DateWeather } from '@/components/date-weather'
import { PoiCuration } from '@/components/poi-curation'
import { RouteSelect } from '@/components/route-select'
import { TripStart } from '@/components/trip-start'
import { useTrip } from '@/stores/trip'
import { lightColors } from '@/theme'
import { spacing } from '@/theme/spacing'

import Companion from '../companion'

/**
 * 여행 탭 = 5 모드 state machine (D27 + D33).
 *
 * 분기:
 *  (1) active === null            → <TripStart />            (★ TRIP START)
 *  (2) active && step === 'dates' → <DateWeather />          (SCENARIO 02.5 · D33)
 *  (3) active && step === 'pois' (또는 undefined) → <PoiCuration /> (SCENARIO 03)
 *  (4) active && step === 'routes'→ <RouteSelect />          (SCENARIO 04)
 *  (5) active && step === 'on_trip'→ <Companion /> (Phase 4c)
 *
 * step undefined 는 'pois' 로 default (legacy caller 호환). TRIP START 의 chip 은 'dates' 로
 * 진입 (D33). SCENARIO 02.5 "이렇게 가요" → setPlanningStep('pois') → SCENARIO 03 진입.
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

  const step = active.planning_step ?? 'pois'

  if (step === 'dates') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: lightColors.bgElev,
          paddingTop: insets.top + spacing.sm,
        }}
      >
        <DateWeather trip={active} />
      </View>
    )
  }

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
          paddingTop: insets.top + spacing.sm,
        }}
      >
        <RouteSelect trip={active} />
      </View>
    )
  }

  // 'on_trip' — 기존 Phase 4c 산출물 재사용
  return <Companion />
}
