import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import type { LLMRoute, LLMRouteList, Trip } from '@trip/types'

import { RouteCard } from '@/components/route-card'
import { streamRoutes } from '@/services/companion/llm-orchestrator'
import { useTrip } from '@/stores/trip'
import { useUserStyle } from '@/stores/user-style'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * SCENARIO 04 동선 선택 (D29).
 *
 * design-preview line 1743-1799 markup 매핑:
 *  - 헤더: "동선 세 갈래" (Pretendard 22px · 청자 색 강조 X · 먹 본문)
 *  - voice 인용: 좌측 청자 2px 보더 + Noto Serif KR "선택지마다 리듬이 달라요. 어느 결이 끌려요?"
 *  - route-card × 3 (Plan A/B/C)
 *  - CTA "{name} 으로 갈래요" — selected 일 때 활성
 *
 * 데이터 흐름:
 *  mount → streamRoutes({city, likedPoiIds, userStyle})
 *  → loading skeleton (3 카드 placeholder + shimmer)
 *  → final 도달 시 routes 표시
 *  → 카드 누르면 selectedLetter 갱신 (carousel 형 선택 X — list + 강조)
 *  → CTA 누르면 useTrip.setPlanningStep('on_trip') → mode router 자동 ON-TRIP 진입
 *
 * 방어:
 *  - likedPoiIds.length < 3 → voice "조금 더 골라보고 동선 만들게요" + "다시 고르기" 버튼 → step 'pois'
 *  - LLM 실패 → friend-tone error voice + "다시" 버튼
 */

const VOICE_LOADING = '결 다른 세 갈래, 짜고 있어요…'
const VOICE_ERROR = '잠깐 결이 엉켰어요. 다시 짜볼게요.'
const VOICE_NEED_MORE = '조금 더 골라보고 동선 만들게요.'
const REQUIRED_LIKES = 3

/**
 * Skeleton shimmer — poi-curation.tsx 의 동일 패턴 재사용 (좌→우 1500ms 빛 흐름).
 */
function SkeletonShimmer({ width, height }: { width: number; height: number }) {
  const x = useSharedValue(-width)
  useEffect(() => {
    x.value = -width
    x.value = withRepeat(
      withTiming(width * 2, { duration: 1500, easing: Easing.linear }),
      -1,
      false,
    )
  }, [x, width])
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }))
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        overflow: 'hidden',
      }}
    >
      <Animated.View style={[{ position: 'absolute', top: 0, width: width * 0.6, height }, style]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  )
}

type RouteSelectState =
  | { status: 'loading' }
  | { status: 'ready'; data: LLMRouteList }
  | { status: 'error' }

interface RouteSelectProps {
  trip: Trip
}

export function RouteSelect({ trip }: RouteSelectProps) {
  const userStyle = useUserStyle(
    useShallow((s) => ({
      tags: s.tags,
      likedPoiIds: s.likedPoiIds,
      dislikedPoiIds: s.dislikedPoiIds,
    })),
  )
  const setPlanningStep = useTrip((s) => s.setPlanningStep)
  const setActiveRoute = useTrip((s) => s.setActiveRoute)

  const [state, setState] = useState<RouteSelectState>({ status: 'loading' })
  // design-preview line 1753 의 .route-card.selected 가 Plan A —
  // 첫 진입 시 Plan A default 선택 → CTA 즉시 활성. 사용자가 탭하면 변경.
  const [selectedLetter, setSelectedLetter] = useState<'A' | 'B' | 'C'>('A')
  const abortRef = useRef<AbortController | null>(null)

  const hasEnoughLikes = userStyle.likedPoiIds.length >= REQUIRED_LIKES

  const fetchRoutes = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState({ status: 'loading' })
    try {
      const current = useUserStyle.getState()
      const gen = streamRoutes({
        city: trip.city,
        likedPoiIds: current.likedPoiIds,
        userStyle: {
          tags: current.tags,
          likedPoiIds: current.likedPoiIds,
          dislikedPoiIds: current.dislikedPoiIds,
        },
      })
      let final: LLMRouteList | undefined
      for await (const ev of gen) {
        if (controller.signal.aborted) return
        if (ev.final) final = ev.final
      }
      if (controller.signal.aborted) return
      if (final) setState({ status: 'ready', data: final })
      else setState({ status: 'error' })
    } catch (err) {
      if (controller.signal.aborted) return
      // eslint-disable-next-line no-console
      console.warn('[route-select] LLM 호출 실패:', err)
      setState({ status: 'error' })
    }
  }, [trip.city])

  useEffect(() => {
    if (!hasEnoughLikes) {
      // 방어 — likedPoiIds 부족하면 LLM 호출 안 하고 안내만
      return
    }
    void fetchRoutes()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchRoutes, hasEnoughLikes])

  const handleSelect = useCallback((letter: 'A' | 'B' | 'C') => {
    setSelectedLetter(letter)
  }, [])

  const selectedRoute: LLMRoute | null =
    state.status === 'ready'
      ? (state.data.routes.find((r) => r.letter === selectedLetter) ?? null)
      : null

  const handleStart = useCallback(() => {
    // D34 — 선택된 동선을 store 에 박아 채팅 SCENARIO 08 (add_poi intent) 가 받을 수 있게.
    // 누락 시 채팅 add_poi → "이대로" 버튼 비활성 → v1.5 핵심 흐름 끊김.
    if (selectedRoute) setActiveRoute(selectedRoute)
    setPlanningStep('on_trip')
  }, [setPlanningStep, setActiveRoute, selectedRoute])

  const handleBackToPois = useCallback(() => {
    setPlanningStep('pois')
  }, [setPlanningStep])

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing['2xl'],
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* 헤더 — design-preview "동선 세 갈래" */}
      <View style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: fonts.size.h1,
            fontWeight: '500',
            color: lightColors.text,
          }}
        >
          동선 세 갈래
        </Text>
      </View>

      {/* voice 인용 — sm 변형 */}
      <View
        style={{
          paddingLeft: spacing.md - 4,
          borderLeftWidth: 2,
          borderLeftColor: lightColors.celadon,
          marginBottom: spacing.lg,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 14,
            lineHeight: 14 * 1.55,
            letterSpacing: -0.14,
            color: lightColors.text,
          }}
        >
          {state.status === 'loading' ? (
            VOICE_LOADING
          ) : state.status === 'error' ? (
            VOICE_ERROR
          ) : !hasEnoughLikes ? (
            VOICE_NEED_MORE
          ) : (
            <>
              <Text style={{ color: lightColors.text }}>선택지마다 </Text>
              <Text style={{ fontStyle: 'italic', color: lightColors.celadon }}>리듬이 달라요</Text>
              <Text style={{ color: lightColors.text }}>. 어느 결이 끌려요?</Text>
            </>
          )}
        </Text>
      </View>

      {/* 부족한 ♥ 안내 + 돌아가기 */}
      {!hasEnoughLikes ? (
        <Pressable
          onPress={handleBackToPois}
          accessibilityRole="button"
          accessibilityLabel="POI 다시 고르기"
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.cardLarge,
            borderWidth: 1,
            borderColor: lightColors.celadon,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: 13,
              color: lightColors.celadon,
            }}
          >
            다시 고르러 가기
          </Text>
        </Pressable>
      ) : null}

      {/* loading skeleton — 3 카드 placeholder (실제 카드 padding 14 / 미니맵 56 매칭) */}
      {hasEnoughLikes && state.status === 'loading'
        ? [0, 1, 2].map((i) => (
            <View
              key={`route-skel-${i}`}
              style={{
                backgroundColor: lightColors.bgElev,
                borderRadius: radius.cardLarge,
                borderWidth: 1,
                borderColor: lightColors.line,
                padding: 14,
                marginBottom: 10,
                opacity: 0.6,
              }}
            >
              {/* head row 자리 */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    height: 15,
                    width: '40%',
                    borderRadius: 4,
                    backgroundColor: lightColors.lineSoft,
                    overflow: 'hidden',
                  }}
                >
                  <SkeletonShimmer width={140} height={15} />
                </View>
                <View
                  style={{
                    height: 13,
                    width: 48,
                    borderRadius: 4,
                    backgroundColor: lightColors.lineSoft,
                    overflow: 'hidden',
                  }}
                >
                  <SkeletonShimmer width={48} height={13} />
                </View>
              </View>
              {/* 미니맵 자리 (56) */}
              <View
                style={{
                  width: '100%',
                  height: 56,
                  borderRadius: 8,
                  backgroundColor: lightColors.celadonSoft,
                  overflow: 'hidden',
                  marginBottom: 10,
                }}
              >
                <SkeletonShimmer width={320} height={56} />
              </View>
              {/* stats 자리 */}
              <View
                style={{
                  height: 11,
                  width: '60%',
                  borderRadius: 4,
                  backgroundColor: lightColors.lineSoft,
                  overflow: 'hidden',
                }}
              >
                <SkeletonShimmer width={200} height={11} />
              </View>
            </View>
          ))
        : null}

      {/* route cards */}
      {hasEnoughLikes && state.status === 'ready'
        ? state.data.routes.map((route) => (
            <RouteCard
              key={route.letter}
              route={route}
              selected={selectedLetter === route.letter}
              onPress={() => handleSelect(route.letter)}
            />
          ))
        : null}

      {/* error retry */}
      {hasEnoughLikes && state.status === 'error' ? (
        <Pressable
          onPress={() => void fetchRoutes()}
          accessibilityRole="button"
          accessibilityLabel="다시 시도"
          style={({ pressed }) => ({
            alignSelf: 'center',
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.cardLarge,
            borderWidth: 1,
            borderColor: lightColors.celadon,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: 13,
              color: lightColors.celadon,
            }}
          >
            다시 시도
          </Text>
        </Pressable>
      ) : null}

      {/* CTA "{letter}로 갈래요" — design-preview line 1789 그대로 */}
      {hasEnoughLikes && state.status === 'ready' ? (
        <Pressable
          onPress={selectedRoute ? handleStart : undefined}
          disabled={!selectedRoute}
          accessibilityRole="button"
          accessibilityLabel={
            selectedRoute ? `Plan ${selectedRoute.letter}로 떠나기` : '동선을 먼저 골라주세요'
          }
          accessibilityState={{ disabled: !selectedRoute }}
          style={({ pressed }) => ({
            marginTop: spacing.sm,
            alignSelf: 'stretch',
            paddingVertical: spacing.sm + 4,
            borderRadius: radius.cardLarge,
            backgroundColor: selectedRoute ? lightColors.celadon : lightColors.lineSoft,
            opacity: pressed && selectedRoute ? 0.85 : 1,
            alignItems: 'center',
          })}
        >
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: 14,
              fontWeight: '500',
              color: selectedRoute ? lightColors.bgElev : lightColors.textSoft,
            }}
          >
            {selectedRoute ? `${selectedRoute.letter}로 갈래요` : '동선을 골라주세요'}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  )
}
