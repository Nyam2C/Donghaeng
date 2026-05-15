import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import type { LLMTripPoiList, Trip, TripPoiCandidate } from '@trip/types'

import { streamTripPois } from '@/services/companion/llm-orchestrator'
import { useTrip } from '@/stores/trip'
import { useUserStyle } from '@/stores/user-style'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * SCENARIO 03 POI 큐레이션 (D29).
 *
 * design-preview line 1660-1738 markup 을 RN 으로 매핑.
 *  - 헤더: "{city} · 2박 3일"  ·  우측 DM Mono 11px "{♥수} / {pois.length}"  (D29 카운터)
 *  - voice 인용: 좌측 청자 2px 보더 + Noto Serif KR
 *  - poi-row × N: 64×64 청자 단색 thumb + 첫 글자 흰 Noto Serif KR · name + meta · ♥/× 36×36
 *  - prompt input + ↑ : "더 한적한 카페만…" → streamTripPois 재호출
 *  - "다음 단계" CTA: ♥≥3 일 때 활성, 미만이면 voice 안내 ("몇 개 더 고르면 동선 만들게요")
 *
 * 데이터 흐름:
 *  mount → streamTripPois({city, userStyle, dislikedIds, prompt:''})
 *  → loading → final 도달 시 list 표시
 *  → ♥ 누르면 useUserStyle.addLike(id) · × 누르면 addDislike(id) + 화면에서 제거
 *  → prompt 보내면 streamTripPois 재호출 (dislikedIds + new prompt)
 *  → "다음 단계" → useTrip.setPlanningStep('routes') → mode router 자동 분기
 *
 * 에러 처리 (D2 정신): hallucination/404 → friend-tone voice fallback + "다시" 버튼
 */

const VOICE_INTRO = '이 안에서 가볼 만한 곳들이에요. 안 끌리면 옆으로 밀어요.'
const VOICE_ERROR = '잠깐 골라보고 있어요. 잠시 후 다시 시도해 주세요.'
const VOICE_LOADING = '여기서 어울릴 곳들 골라보고 있어요…'
const REQUIRED_LIKES = 3

// 카테고리별 thumb 그라데이션 — design-preview line 1660-1700 의 bg-poi-1~5 정신.
// theme/colors.ts 에 alpha 토큰 부재라 inline 정의. Phase 5+ theme freeze 해제 시 토큰화 후보.
type ThumbGradient = readonly [string, string, string]
const CATEGORY_GRADIENTS: Record<string, ThumbGradient> = {
  카페: ['#6B89B5', '#4A6FA5', '#2E4E7F'], // 바다 청자 (안목 해변 패턴)
  맛집: ['#E8B860', '#C99A40', '#8E6A2A'], // 황 (시장 패턴)
  관광: ['#88B098', '#5F8B6E', '#3A5A4A'], // 녹청 (자연 패턴)
  문화: ['#88B098', '#4A6FA5', '#2E4E7F'], // 녹청→청자 (책방 패턴)
  자연: ['#6B89B5', '#88B098', '#5F8B6E'], // 청자→녹청 (호수 패턴)
}
const DEFAULT_THUMB_GRADIENT: ThumbGradient = ['#6B89B5', '#4A6FA5', '#2E4E7F']

function gradFor(category: string): ThumbGradient {
  return CATEGORY_GRADIENTS[category] ?? DEFAULT_THUMB_GRADIENT
}

/**
 * Skeleton shimmer overlay — 좌→우 빛 흐름 (1500ms). recommend.tsx 의 동일 패턴.
 * 자식 element 의 위에 절대 위치로 덮음. parent 가 overflow:hidden 이어야 깔끔.
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
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        pointerEvents: 'none',
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

type CurationState =
  | { status: 'loading' }
  | { status: 'ready'; data: LLMTripPoiList }
  | { status: 'error' }

interface PoiCurationProps {
  trip: Trip
}

export function PoiCuration({ trip }: PoiCurationProps) {
  const userStyle = useUserStyle(
    useShallow((s) => ({
      tags: s.tags,
      likedPoiIds: s.likedPoiIds,
      dislikedPoiIds: s.dislikedPoiIds,
    })),
  )
  const addLike = useUserStyle((s) => s.addLike)
  const addDislike = useUserStyle((s) => s.addDislike)
  const setPlanningStep = useTrip((s) => s.setPlanningStep)

  const [state, setState] = useState<CurationState>({ status: 'loading' })
  const [promptText, setPromptText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // 도시 변경되면 cache invalidate — 새 도시로 streamTripPois 호출.
  // dep 은 trip.city 만. userStyle 객체는 ♥/× 누를 때마다 새 ref 라서 dep 에 두면
  // mount effect 가 매번 재실행 → LLM 재호출. 최신 userStyle 은 store 에서 직접 read.
  const fetchPois = useCallback(
    async (prompt: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setState({ status: 'loading' })
      try {
        const current = useUserStyle.getState()
        const gen = streamTripPois({
          city: trip.city,
          userStyle: {
            tags: current.tags,
            likedPoiIds: current.likedPoiIds,
            dislikedPoiIds: current.dislikedPoiIds,
          },
          dislikedIds: current.dislikedPoiIds,
          prompt,
        })
        let final: LLMTripPoiList | undefined
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
        console.warn('[poi-curation] LLM 호출 실패:', err)
        setState({ status: 'error' })
      }
    },
    [trip.city],
  )

  useEffect(() => {
    void fetchPois('')
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchPois])

  const handleSendPrompt = useCallback(() => {
    const trimmed = promptText.trim()
    if (trimmed.length === 0) return
    void fetchPois(trimmed)
    setPromptText('')
  }, [promptText, fetchPois])

  const handleNext = useCallback(() => {
    setPlanningStep('routes')
  }, [setPlanningStep])

  // dislike 처리된 POI 는 화면에서 즉시 제거 (UX) — 다음 LLM 재호출은 prompt 시점에
  const visiblePois: TripPoiCandidate[] = useMemo(() => {
    if (state.status !== 'ready') return []
    const dislikedSet = new Set(userStyle.dislikedPoiIds)
    return state.data.pois.filter((p) => !dislikedSet.has(p.id))
  }, [state, userStyle.dislikedPoiIds])

  // D29 카운터: 좋아요한 수 / LLM 전체 (12 / 23 패턴)
  const likedInList = useMemo(() => {
    if (state.status !== 'ready') return 0
    const likedSet = new Set(userStyle.likedPoiIds)
    return state.data.pois.filter((p) => likedSet.has(p.id)).length
  }, [state, userStyle.likedPoiIds])

  const totalInList = state.status === 'ready' ? state.data.pois.length : 0

  // 일자 표시 — Trip.startDate/endDate 가 있으면 일수 계산
  const tripDuration = useMemo(() => {
    if (!trip.startDate || !trip.endDate) return ''
    const start = new Date(trip.startDate)
    const end = new Date(trip.endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return ''
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
    const nights = days - 1
    return nights > 0 ? `${nights}박 ${days}일` : `${days}일`
  }, [trip.startDate, trip.endDate])

  const meetsThreshold = userStyle.likedPoiIds.length >= REQUIRED_LIKES

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
      {/* 헤더: 도시 · 기간  ·  ♥수 / 전체 */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: spacing.sm,
          marginBottom: spacing.xs,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: fonts.size.h2,
            fontWeight: '500',
            color: lightColors.text,
          }}
          numberOfLines={1}
        >
          {tripDuration ? `${trip.city} · ${tripDuration}` : trip.city}
        </Text>
        <Text
          style={{
            fontFamily: fonts.family.mono,
            fontSize: 11,
            color: lightColors.textSoft,
          }}
        >
          {likedInList} / {totalInList || '–'}
        </Text>
      </View>

      {/* voice 인용 — sm 변형 */}
      <View
        style={{
          paddingLeft: spacing.md - 4,
          borderLeftWidth: 2,
          borderLeftColor: lightColors.celadon,
          marginBottom: spacing.md,
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
          {state.status === 'loading'
            ? VOICE_LOADING
            : state.status === 'error'
              ? VOICE_ERROR
              : null}
          {state.status === 'ready' ? (
            <>
              <Text style={{ color: lightColors.text }}>이 안에서 가볼 만한 곳들이에요. </Text>
              <Text style={{ fontStyle: 'italic', color: lightColors.celadon }}>
                안 끌리면 옆으로
              </Text>
              <Text style={{ color: lightColors.text }}> 밀어요.</Text>
            </>
          ) : null}
        </Text>
      </View>

      {/* loading skeleton — shimmer overlay 적용 (1500ms 좌→우, recommend.tsx 동일 패턴) */}
      {state.status === 'loading'
        ? [0, 1, 2, 3].map((i) => (
            <View
              key={`skel-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm + 4,
                paddingVertical: spacing.sm + 2,
                marginBottom: spacing.sm,
                opacity: 0.55,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  backgroundColor: lightColors.celadonSoft,
                  overflow: 'hidden',
                }}
              >
                <SkeletonShimmer width={64} height={64} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <View
                  style={{
                    height: 14,
                    width: '45%',
                    borderRadius: 4,
                    backgroundColor: lightColors.celadonSoft,
                    overflow: 'hidden',
                  }}
                >
                  <SkeletonShimmer width={180} height={14} />
                </View>
                <View
                  style={{
                    height: 10,
                    width: '70%',
                    borderRadius: 4,
                    backgroundColor: lightColors.lineSoft,
                    overflow: 'hidden',
                  }}
                >
                  <SkeletonShimmer width={260} height={10} />
                </View>
              </View>
            </View>
          ))
        : null}

      {/* POI rows */}
      {state.status === 'ready' && visiblePois.length === 0 ? (
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 14,
            color: lightColors.textMuted,
            marginTop: spacing.md,
          }}
        >
          다 밀어버렸네요. 아래에서 다시 골라달라고 해보세요.
        </Text>
      ) : null}

      {state.status === 'ready'
        ? visiblePois.map((poi) => {
            const isLiked = userStyle.likedPoiIds.includes(poi.id)
            return (
              <View
                key={poi.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm + 4,
                  paddingVertical: spacing.sm + 2,
                  marginBottom: spacing.xs,
                }}
              >
                {/* thumb 64×64 카테고리별 그라데이션 (design-preview 의 bg-poi-1~5 패턴 — 글자 X) */}
                <LinearGradient
                  colors={[...gradFor(poi.category)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    flexShrink: 0,
                  }}
                />

                {/* info */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.family.voice,
                      fontSize: 14,
                      fontWeight: '500',
                      color: lightColors.text,
                      marginBottom: 2,
                    }}
                  >
                    {poi.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.family.ui,
                      fontSize: 11,
                      lineHeight: 11 * 1.45,
                      color: lightColors.textMuted,
                    }}
                  >
                    {poi.category}
                  </Text>
                </View>

                {/* actions ♥ × */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${poi.name} 좋아요`}
                    accessibilityState={{ selected: isLiked }}
                    onPress={() => addLike(poi.id, { name: poi.name, category: poi.category })}
                    hitSlop={6}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: isLiked ? lightColors.celadon : lightColors.line,
                      backgroundColor: isLiked ? lightColors.celadon : lightColors.bgElev,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.family.ui,
                        fontSize: 14,
                        color: isLiked ? lightColors.bgElev : lightColors.celadon,
                      }}
                    >
                      {'♥'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${poi.name} 스킵`}
                    onPress={() => addDislike(poi.id)}
                    hitSlop={6}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: lightColors.line,
                      backgroundColor: lightColors.bgElev,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.family.ui,
                        fontSize: 14,
                        color: lightColors.textMuted,
                      }}
                    >
                      ×
                    </Text>
                  </Pressable>
                </View>
              </View>
            )
          })
        : null}

      {/* error retry */}
      {state.status === 'error' ? (
        <Pressable
          onPress={() => void fetchPois('')}
          accessibilityRole="button"
          accessibilityLabel="다시 시도"
          style={{
            marginTop: spacing.sm,
            alignSelf: 'center',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.cardLarge,
            borderWidth: 1,
            borderColor: lightColors.celadon,
          }}
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

      {/* prompt input — "더 한적한 카페만…" */}
      <View
        style={{
          marginTop: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: lightColors.bgElev,
          borderWidth: 1,
          borderColor: lightColors.line,
          borderRadius: radius.cardLarge,
          paddingVertical: spacing.sm + 4,
          paddingHorizontal: spacing.md - 2,
          gap: 10,
          opacity: state.status === 'loading' ? 0.55 : 1,
        }}
      >
        <TextInput
          value={promptText}
          onChangeText={setPromptText}
          placeholder={'"더 한적한 카페만…"'}
          placeholderTextColor={lightColors.textSoft}
          editable={state.status !== 'loading'}
          style={{
            flex: 1,
            fontFamily: fonts.family.ui,
            fontSize: 13,
            color: lightColors.text,
            padding: 0,
            minHeight: 20,
          }}
          accessibilityLabel="추가 큐레이션 prompt"
          returnKeyType="send"
          onSubmitEditing={handleSendPrompt}
        />
        <Pressable
          onPress={handleSendPrompt}
          disabled={promptText.trim().length === 0 || state.status === 'loading'}
          accessibilityRole="button"
          accessibilityLabel="보내기"
          hitSlop={8}
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            backgroundColor: lightColors.celadon,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: promptText.trim().length === 0 || state.status === 'loading' ? 0.55 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: 13,
              color: '#FAFAFA',
              lineHeight: 13,
            }}
          >
            {'↑'}
          </Text>
        </Pressable>
      </View>

      {/* "다음 단계" CTA — ♥≥3 활성 */}
      <View style={{ marginTop: spacing.md }}>
        {!meetsThreshold ? (
          <View
            style={{
              paddingLeft: spacing.md - 4,
              borderLeftWidth: 2,
              borderLeftColor: lightColors.celadon,
              marginBottom: spacing.sm,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.family.voice,
                fontSize: 13,
                lineHeight: 13 * 1.55,
                color: lightColors.textMuted,
              }}
            >
              {REQUIRED_LIKES - userStyle.likedPoiIds.length}개 더 고르면 동선 만들게요
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={meetsThreshold ? handleNext : undefined}
          disabled={!meetsThreshold}
          accessibilityRole="button"
          accessibilityLabel="다음 단계"
          accessibilityState={{ disabled: !meetsThreshold }}
          style={({ pressed }) => ({
            alignSelf: 'stretch',
            paddingVertical: spacing.sm + 4,
            borderRadius: radius.cardLarge,
            backgroundColor: meetsThreshold ? lightColors.celadon : lightColors.lineSoft,
            opacity: pressed && meetsThreshold ? 0.85 : 1,
            alignItems: 'center',
          })}
        >
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: 14,
              fontWeight: '500',
              color: meetsThreshold ? lightColors.bgElev : lightColors.textSoft,
            }}
          >
            다음 단계
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
