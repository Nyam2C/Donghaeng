import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PoiCuration } from '@/components/poi-curation'
import { RouteSelect } from '@/components/route-select'
import { TripStart } from '@/components/trip-start'
import { useTrip } from '@/stores/trip'
import { lightColors } from '@/theme'
import { spacing } from '@/theme/spacing'

import Companion from '../companion'

/**
 * 여행 탭 = 4 모드 state machine (D27).
 *
 * 분기:
 *  (1) active === null            → <TripStart />            (★ TRIP START)
 *  (2) active && step === 'pois' (또는 undefined) → <PoiCuration /> (SCENARIO 03)
 *  (3) active && step === 'routes'→ <RouteSelect />          (SCENARIO 04)
 *  (4) active && step === 'on_trip'→ <Companion /> (Phase 4c)
 *
 * step undefined 는 'pois' 로 default — startTrip 만 호출된 케이스가 짜는 단계
 * (SCENARIO 03) 부터 시작하는 게 자연스러운 흐름. 'on_trip' 은 명시적 진입만 (SCENARIO 04
 * "A로 갈래요" 또는 RouteSelectPlaceholder skip).
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
