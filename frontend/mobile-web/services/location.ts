import * as Location from 'expo-location'

import type { GpsCoord } from '@trip/types'

/**
 * 현재 GPS 1회 조회. 권한 미허가 시 throw — caller 가 AWAY fallback.
 * accuracy=Balanced — 약 10m 정확도, 배터리 무난.
 */
export async function getCurrentGps(): Promise<GpsCoord> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('위치 권한 필요')
  }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  })
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? undefined,
  }
}

/**
 * GPS 구독. 50m 또는 30초 간격마다 onUpdate 호출. unsubscribe 함수 반환.
 * 권한 거부 시 즉시 throw — caller 가 AWAY 카드 fallback.
 */
export function subscribeGps(onUpdate: (gps: GpsCoord) => void): () => void {
  let subscription: Location.LocationSubscription | null = null
  let cancelled = false

  void (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      throw new Error('위치 권한 필요')
    }
    if (cancelled) return
    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 50,
        timeInterval: 30000,
      },
      (pos) => {
        onUpdate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
        })
      },
    )
    if (cancelled) {
      subscription.remove()
      subscription = null
    }
  })()

  return () => {
    cancelled = true
    if (subscription) {
      subscription.remove()
      subscription = null
    }
  }
}
