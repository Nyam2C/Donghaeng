import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { GpsCoord, KakaoCategory, KakaoPOI } from '@trip/types'

import { MiniMap } from '@/components/mini-map'
import { nearbyPois } from '@/services/poi'
import { useTrip } from '@/stores/trip'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * Phase 4d (D31) — ON-TRIP COMPANION 우상단 ⊕ 진입 지도 모달.
 *
 * 풀스크린 slide-up Modal (300ms Reanimated).
 *  - 상단 240 미니맵 (stylized · react-native-maps 의존 X)
 *  - 하단 시트: 핸들 + 헤더 ("인근 {N}곳" + "{지명} · {온도}") + POI row × N
 *  - 좌상단 × → onClose, 우상단 🎙️ → v1 visual only
 *  - voice 인용: "바람 좋아요. 30분쯤 더 머물러도." 친구 톤 fallback
 *
 * 시그니처: scaffold 의 placeholder stub (props 미정) 였음. D31 명세 정의에 맞춰
 *   props 추가 — visible/onClose. caller 0 (companion.tsx 에서 새로 mount).
 */

interface CompanionMapProps {
  visible: boolean
  onClose: () => void
}

// 강릉 default (currentLocation 없을 때) — 디자인 preview 와 일치
const FALLBACK_GPS: GpsCoord = { lat: 37.7917, lng: 128.9015 }

const POI_CATEGORIES: KakaoCategory[] = ['CE7', 'FD6', 'AT4', 'CT1']

// design-preview line 2011/2019 의 thumb 그라데이션 직역 — 카테고리별 무드.
// 끝 stop 은 theme 토큰 (amber/juhong/moss/celadon). 시작 stop `#88B098` 은
// light theme 에 토큰 없는 moss soft variant — design-preview 직역으로 inline.
const CATEGORY_THUMB: Record<string, readonly [string, string]> = {
  CE7: [lightColors.amber, lightColors.juhong], // 안목 패턴 (황→주홍)
  FD6: [lightColors.amber, lightColors.juhong],
  AT4: ['#88B098', lightColors.moss], // 자연 (녹청)
  CT1: ['#88B098', lightColors.celadon], // 책방 (녹청→청자)
  AD5: ['#88B098', lightColors.moss],
}
const DEFAULT_THUMB: readonly [string, string] = ['#88B098', lightColors.celadon]

// 친구 톤 voice fallback — Phase 5a 통합 후 LLM 응답 사용
const VOICE_FALLBACK = '바람 좋아요. 30분쯤 더 머물러도.'

/** Haversine — 두 좌표 사이 km */
function haversineKm(a: GpsCoord, b: GpsCoord): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** 도보 분 — 4 km/h, 최소 1분 */
function walkingMinutes(km: number): number {
  return Math.max(1, Math.round((km / 4) * 60))
}

function thumbFor(category: string): readonly [string, string] {
  return CATEGORY_THUMB[category] ?? DEFAULT_THUMB
}

export function CompanionMap({ visible, onClose }: CompanionMapProps) {
  const insets = useSafeAreaInsets()
  const currentLocation = useTrip((s) => s.currentLocation)
  // ref 안정화 — currentLocation lat/lng 만 dep 로. fallback 은 const 라 동일 ref.
  const center: GpsCoord = useMemo(
    () => currentLocation ?? FALLBACK_GPS,
    [currentLocation?.lat, currentLocation?.lng, currentLocation],
  )

  const [pois, setPois] = useState<KakaoPOI[]>([])
  const fetchedRef = useRef<{ lat: number; lng: number } | null>(null)

  // visible 트랜지션 — slide-up/down (300ms)
  const translateY = useSharedValue(1000)
  const [internalVisible, setInternalVisible] = useState(false)

  useEffect(() => {
    if (visible) {
      setInternalVisible(true)
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      })
    } else if (internalVisible) {
      translateY.value = withTiming(
        1000,
        { duration: 300, easing: Easing.in(Easing.cubic) },
        (finished) => {
          'worklet'
          if (finished) {
            runOnJS(setInternalVisible)(false)
          }
        },
      )
    }
  }, [visible, internalVisible, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  // visible 시 1회 fetch (좌표 변동 시 재호출)
  useEffect(() => {
    if (!visible) return
    const prev = fetchedRef.current
    if (prev && prev.lat === center.lat && prev.lng === center.lng) return
    let cancelled = false
    void (async () => {
      try {
        const data = await nearbyPois(center, POI_CATEGORIES)
        if (!cancelled) {
          setPois(data)
          fetchedRef.current = { lat: center.lat, lng: center.lng }
        }
      } catch {
        // 친구 톤 — silent fallback 빈 list 유지
        if (!cancelled) setPois([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [visible, center])

  // POI 별 거리/분 계산 — 정렬 후 시각화/시트 동기
  const enriched = useMemo(
    () =>
      pois
        .map((p) => {
          const km = haversineKm(center, { lat: p.lat, lng: p.lng })
          const distanceMin = walkingMinutes(km)
          return { poi: p, km, distanceMin }
        })
        .sort((a, b) => a.km - b.km),
    [pois, center],
  )

  const miniPois = useMemo(
    () =>
      enriched.map((e) => ({
        id: e.poi.id,
        lat: e.poi.lat,
        lng: e.poi.lng,
        name: e.poi.name,
        category: e.poi.category,
        distanceMin: e.distanceMin,
      })),
    [enriched],
  )

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  if (!internalVisible) return null

  return (
    <Modal
      visible={internalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: lightColors.bgElev,
          },
          animatedStyle,
        ]}
      >
        {/* 상단 미니맵 — safe area top 만큼 padding 더해 status bar 영역 보호 */}
        <View style={{ paddingTop: insets.top, backgroundColor: lightColors.bgElev }}>
          <MiniMap
            center={center}
            pois={miniPois}
            height={240}
            onClose={handleClose}
            voiceText={VOICE_FALLBACK}
          />
        </View>

        {/* 하단 시트 — 단순 ScrollView (D31 가벼운 옵션 선택, @gorhom/bottom-sheet 도입 X) */}
        <ScrollView
          style={{ flex: 1, backgroundColor: lightColors.bgElev }}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 14,
            paddingBottom: insets.bottom + spacing['2xl'],
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* 시트 핸들 */}
          <View
            style={{
              width: 36,
              height: 3,
              backgroundColor: 'rgba(31,31,31,0.15)',
              borderRadius: radius.pill,
              alignSelf: 'center',
              marginBottom: 14,
            }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />

          {/* 헤더: "인근 {N}곳" · 지명 · 온도 (날씨는 v1 미구현 — 친구 톤 placeholder) */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.family.voice,
                fontSize: 14,
                fontWeight: '500',
                color: lightColors.text,
              }}
            >
              인근 {enriched.length}곳
            </Text>
            <Text
              style={{
                fontFamily: fonts.family.mono,
                fontSize: 11,
                color: lightColors.textSoft,
              }}
            >
              {currentLocation ? '주변' : '강릉'} · –°
            </Text>
          </View>

          {/* POI rows */}
          {enriched.length === 0 ? (
            <Text
              style={{
                fontFamily: fonts.family.voice,
                fontSize: 13,
                lineHeight: 13 * 1.55,
                color: lightColors.textMuted,
                paddingVertical: spacing.md,
              }}
            >
              근처는 잠시 후 다시 둘러볼게요.
            </Text>
          ) : null}

          {enriched.map(({ poi, distanceMin }, idx) => {
            const [c1, c2] = thumbFor(poi.category)
            return (
              <View
                key={poi.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  borderBottomWidth: idx < enriched.length - 1 ? 1 : 0,
                  borderBottomColor: lightColors.line,
                }}
              >
                <LinearGradient
                  colors={[c1, c2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.small,
                    flexShrink: 0,
                  }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.family.voice,
                      fontSize: 14,
                      fontWeight: '500',
                      color: lightColors.text,
                    }}
                  >
                    {poi.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.family.voice,
                      fontSize: 11,
                      fontStyle: 'italic',
                      color: lightColors.celadon,
                    }}
                  >
                    {metaFor(poi.category)}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: fonts.family.mono,
                    fontSize: 11,
                    color: lightColors.textMuted,
                  }}
                >
                  {distanceMin}분
                </Text>
              </View>
            )
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  )
}

/** 카테고리별 친구 톤 meta 한 줄 — design-preview line 2014/2022 톤 일관 */
function metaFor(category: string): string {
  switch (category) {
    case 'CE7':
      return '사람 적은 시간'
    case 'FD6':
      return '근처 단골 톤'
    case 'AT4':
      return '천천히 걸어요'
    case 'CT1':
      return '조용한 2층'
    case 'AD5':
      return '바람 맞기 좋은'
    default:
      return '둘러볼 만한'
  }
}
