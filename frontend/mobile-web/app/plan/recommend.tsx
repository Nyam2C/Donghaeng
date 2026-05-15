import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { CityCandidate, LLMCityRecommendation } from '@trip/types'

import { InkMark } from '@/components/ink-mark'
import { streamCityRecommendation } from '@/services/companion/llm-orchestrator'
import { useTrip } from '@/stores/trip'
import { useUserStyle } from '@/stores/user-style'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * Phase 3 (확장 · D21) — AI 도시 추천 (design-preview SCENARIO 02)
 *
 *  "네 곳 골라봤어요"
 *  → mount 시 useUserStyle.tags + utterance 로 streamCityRecommendation 호출
 *  → loading 동안 동적 애니메이션 (shimmer + typewriter + dots + ink 호흡)
 *  → final 도착 시 4 도시 카드 + note 한 줄
 *  → 에러 시 fallback voice ("결을 더 알아갈 시간이 필요해요...")
 *
 * design-preview.html line 1598-1656 markup 을 RN 으로 변환 (LLM 동적 응답으로 교체).
 *
 * D5: useUserStyle.tags 가 비어있으면 SCENARIO 01 로 redirect.
 * AbortController 로 unmount 시 fetch 중단 → memory leak 방지.
 *
 * DESIGN.md 토큰만:
 *  - 외곽 bgElev (#FFFFFF) — home.tsx · plan/new.tsx 일관
 *  - 카드 배경 = 한지 bg + line 1px
 *  - rec-name = Noto Serif KR 16px
 *  - rec-reason = Pretendard 11px textMuted
 *  - rec-match = Fraunces italic 18px celadon · .pct = DM Mono 11px textSoft
 *  - thumb = 64x64 청자/녹청/황 톤 그라데이션 4 종 순환 + 첫 글자 흰색 Noto Serif KR
 *  - voice 인용 = 좌측 청자 2px 보더 + Noto Serif KR
 *  - loading shimmer = transparent → rgba(255,255,255,0.35) → transparent · 1500ms linear repeat
 *  - 거품 radius / 보라 그라데이션 / UI 이모지 금지
 */

// design-preview.html line 646-649 도시 그라데이션 4 종
// 1) 바다 청자 (gangneung) · 2) 녹청→청자 (tongyeong)
// 3) 녹청→황 (jeju-s) · 4) 청자→녹청 (geoje)
// 도시명-그라데이션 고정 매핑 X — 카드 index % 4 로 순환 (LLM 응답 도시가 동적이므로)
const REC_GRADIENTS: readonly [string, string, string][] = [
  ['#6B89B5', '#4A6FA5', '#2E4E7F'],
  ['#88B098', '#4A6FA5', '#2E4E7F'],
  ['#5F8B6E', '#88B098', '#E8B860'],
  ['#4A6FA5', '#6B89B5', '#88B098'],
]

interface RecommendedCity extends CityCandidate {
  /** 썸네일 첫 글자 (도시명 앞 한 글자, "제주 남부" 는 "제") */
  glyph: string
}

function toRecommended(c: CityCandidate): RecommendedCity {
  // 첫 글자 추출. 공백 또는 빈 문자열 가드.
  const trimmed = c.name.trim()
  const glyph = trimmed.length > 0 ? trimmed[0] : '·'
  return { ...c, glyph }
}

type RecommendState =
  | { status: 'loading' }
  | { status: 'ready'; data: LLMCityRecommendation }
  | { status: 'error' }

/**
 * Skeleton shimmer — 좌→우 빛 흐름.
 * 카드 thumb · line bar 위에 깔리는 transparent 그라데이션 overlay.
 * delay 는 외부에서 mount 시점 차로 자연스러운 sequential 흐름 표현 (per-card).
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
        height,
        pointerEvents: 'none',
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

/**
 * Typewriter — 한 글자씩 fade-in (60ms/글자 default).
 * text 변경 시 처음부터 다시. 부모가 voice 인용 스타일 (Text 자식) 로 감싼다.
 */
function TypewriterText({
  text,
  charDelay = 60,
  style,
}: {
  text: string
  charDelay?: number
  style?: React.ComponentProps<typeof Text>['style']
}) {
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    setVisible(0)
    const interval = setInterval(() => {
      setVisible((v) => {
        if (v < text.length) return v + 1
        clearInterval(interval)
        return v
      })
    }, charDelay)
    return () => clearInterval(interval)
  }, [text, charDelay])
  return <Text style={style}>{text.slice(0, visible)}</Text>
}

/**
 * Dots loader — 점 3개 차례로 켜졌다 같이 꺼지는 1.2초 cycle.
 * voice 인용 끝의 inline · 차분한 톤 (점 = 청자).
 *
 * timeline (t ∈ [0, 1]):
 *  - 0.00~0.25 : dot1 fade-in (0.15 → 1)
 *  - 0.25~0.50 : dot2 fade-in
 *  - 0.50~0.75 : dot3 fade-in
 *  - 0.75~1.00 : 셋 다 fade-out
 */
function computeDotOpacity(v: number, offset: number): number {
  'worklet'
  if (v < offset) return 0.15
  if (v < offset + 0.25) return 0.15 + (v - offset) * 4 * 0.85
  if (v < 0.75) return 1
  return 1 - (v - 0.75) * 4 * 0.85
}

function DotsLoader() {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = 0
    t.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false)
  }, [t])

  const d1 = useAnimatedStyle(() => ({ opacity: computeDotOpacity(t.value, 0) }))
  const d2 = useAnimatedStyle(() => ({ opacity: computeDotOpacity(t.value, 0.25) }))
  const d3 = useAnimatedStyle(() => ({ opacity: computeDotOpacity(t.value, 0.5) }))

  const dotBase = {
    fontFamily: fonts.family.voice,
    fontSize: 14,
    color: lightColors.celadon,
    lineHeight: 14 * 1.55,
    marginLeft: 2,
  } as const

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 2,
      }}
    >
      <Animated.Text style={[dotBase, d1]}>·</Animated.Text>
      <Animated.Text style={[dotBase, d2]}>·</Animated.Text>
      <Animated.Text style={[dotBase, d3]}>·</Animated.Text>
    </View>
  )
}

export default function PlanRecommend() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const tags = useUserStyle((s) => s.tags)
  const startTrip = useTrip((s) => s.startTrip)

  const [state, setState] = useState<RecommendState>({ status: 'loading' })
  const [promptText, setPromptText] = useState('')

  // 결 없으면 SCENARIO 01 로 redirect (D5 user-style persist 가 비어있는 케이스)
  const tagsEmpty = tags.length === 0
  useEffect(() => {
    if (tagsEmpty) router.replace('/plan/new')
  }, [tagsEmpty, router])

  // AbortController 로 unmount 시 fetch 중단
  const abortRef = useRef<AbortController | null>(null)

  const fetchRecommendation = useCallback(
    async (utterance: string) => {
      if (tagsEmpty) return
      // 이전 요청 중단
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setState({ status: 'loading' })
      try {
        const gen = streamCityRecommendation({
          userStyle: { tags, likedPoiIds: [], dislikedPoiIds: [] },
          utterance,
        })
        let final: LLMCityRecommendation | undefined
        for await (const event of gen) {
          if (controller.signal.aborted) return
          if (event.final) final = event.final
        }
        if (controller.signal.aborted) return
        if (final) {
          setState({ status: 'ready', data: final })
        } else {
          setState({ status: 'error' })
        }
      } catch (err) {
        if (controller.signal.aborted) return
        // eslint-disable-next-line no-console
        console.warn('[plan/recommend] LLM 호출 실패:', err)
        setState({ status: 'error' })
      }
    },
    [tags, tagsEmpty],
  )

  useEffect(() => {
    void fetchRecommendation('')
    return () => {
      abortRef.current?.abort()
    }
    // mount 시 1회 + tags 변경 시 (드물게 SCENARIO 01 재진입 후) 재호출
  }, [fetchRecommendation])

  const handleSelectCity = useCallback(
    (city: RecommendedCity) => {
      // D35 — 도시 선택 시 SCENARIO 02.4 (DATE PICKER) 진입. 분위기 카드 / chip 두 경로 일관성.
      // default 2박 3일 prefill (DatePicker 가 사용자 조정 받음 → 02.5 → 03).
      const today = new Date().toISOString().slice(0, 10)
      const endDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
      startTrip({
        city: city.name,
        startDate: today,
        endDate,
        vibeTags: tags,
        planning_step: 'date_picker',
      })
      router.push('/(tabs)/travel')
    },
    [tags, startTrip, router],
  )

  const handleSendPrompt = useCallback(() => {
    const trimmed = promptText.trim()
    if (trimmed.length === 0) return
    // 추가 발화 → LLM 재호출 (다른 결 조합)
    void fetchRecommendation(trimmed)
    setPromptText('')
  }, [promptText, fetchRecommendation])

  const cities: RecommendedCity[] =
    state.status === 'ready' ? state.data.cities.map(toRecommended) : []

  return (
    <View style={{ flex: 1, backgroundColor: lightColors.bgElev }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* greet — InkMark + "네 곳 골라봤어요" (loading 일 땐 살짝 큰 호흡) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: spacing.lg,
            marginBottom: spacing.sm + 2,
          }}
        >
          <InkMark size={state.status === 'loading' ? 32 : 28} glow="normal" />
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 20,
              fontWeight: '500',
              color: lightColors.text,
            }}
          >
            {state.status === 'ready' ? '네 곳 골라봤어요' : '윤서님 결을 살펴보고 있어요'}
          </Text>
        </View>

        {/* voice 인용 — sm 변형 · 좌측 청자 2px 보더 + Noto Serif KR */}
        <View
          style={{
            paddingLeft: spacing.md - 4,
            borderLeftWidth: 2,
            borderLeftColor: lightColors.celadon,
            marginBottom: spacing.lg,
          }}
        >
          {state.status === 'loading' ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <Text
                  style={{
                    fontFamily: fonts.family.voice,
                    fontSize: 14,
                    lineHeight: 14 * 1.55,
                    letterSpacing: -0.14,
                    color: lightColors.celadon,
                    fontStyle: 'italic',
                  }}
                >
                  잠깐만요
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.family.voice,
                    fontSize: 14,
                    lineHeight: 14 * 1.55,
                    letterSpacing: -0.14,
                    color: lightColors.text,
                  }}
                >
                  ,{' '}
                </Text>
                <TypewriterText
                  text="결에 어울리는 곳을"
                  style={{
                    fontFamily: fonts.family.voice,
                    fontSize: 14,
                    lineHeight: 14 * 1.55,
                    letterSpacing: -0.14,
                    color: lightColors.text,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TypewriterText
                  text="한 번 골라보고 있어요"
                  charDelay={60}
                  style={{
                    fontFamily: fonts.family.voice,
                    fontSize: 14,
                    lineHeight: 14 * 1.55,
                    letterSpacing: -0.14,
                    color: lightColors.text,
                  }}
                />
                <DotsLoader />
              </View>
            </>
          ) : state.status === 'ready' ? (
            <>
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 14,
                  lineHeight: 14 * 1.55,
                  letterSpacing: -0.14,
                  color: lightColors.text,
                }}
              >
                윤서님같은 분에게 어울릴 거예요.
              </Text>
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 14,
                  lineHeight: 14 * 1.55,
                  letterSpacing: -0.14,
                  color: lightColors.text,
                }}
              >
                <Text style={{ fontStyle: 'italic', color: lightColors.celadon }}>
                  {state.data.note || '비슷한 결, 다른 결'}
                </Text>
                {state.data.note ? '' : '로 섞었어요.'}
              </Text>
            </>
          ) : (
            <>
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 14,
                  lineHeight: 14 * 1.55,
                  letterSpacing: -0.14,
                  color: lightColors.text,
                }}
              >
                결을 더 알아갈 시간이 필요해요.
              </Text>
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 14,
                  lineHeight: 14 * 1.55,
                  letterSpacing: -0.14,
                  color: lightColors.text,
                }}
              >
                <Text style={{ fontStyle: 'italic', color: lightColors.celadon }}>잠시 후</Text>
                다시 시도해 주세요.
              </Text>
            </>
          )}
        </View>

        {/* rec-card * 4 (loading 일 땐 shimmer placeholder · ready 일 땐 실제 그라데이션 thumb) */}
        {state.status === 'loading'
          ? [0, 1, 2, 3].map((i) => (
              <View
                key={`placeholder-${i}`}
                accessibilityLabel="추천 불러오는 중"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm + 4,
                  padding: spacing.sm + 4,
                  borderRadius: radius.cardLarge,
                  backgroundColor: lightColors.bg,
                  borderWidth: 1,
                  borderColor: lightColors.line,
                  marginBottom: spacing.sm + 2,
                }}
              >
                {/* thumb placeholder — 카드 index 별 그라데이션 (옅게 · shimmer overlay) */}
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <LinearGradient
                    colors={REC_GRADIENTS[i % 4]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: 64, height: 64, opacity: 0.45 }}
                  />
                  <SkeletonShimmer width={64} height={64} />
                </View>

                {/* line bar placeholders + shimmer */}
                <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                  <View
                    style={{
                      height: 14,
                      width: '40%',
                      borderRadius: 4,
                      backgroundColor: lightColors.celadonSoft,
                      opacity: 0.35,
                      overflow: 'hidden',
                    }}
                  >
                    <SkeletonShimmer width={140} height={14} />
                  </View>
                  <View
                    style={{
                      height: 10,
                      width: '75%',
                      borderRadius: 4,
                      backgroundColor: lightColors.celadonSoft,
                      opacity: 0.3,
                      overflow: 'hidden',
                    }}
                  >
                    <SkeletonShimmer width={220} height={10} />
                  </View>
                </View>

                {/* match number bar */}
                <View
                  style={{
                    width: 32,
                    height: 14,
                    borderRadius: 4,
                    backgroundColor: lightColors.celadonSoft,
                    opacity: 0.35,
                    overflow: 'hidden',
                  }}
                >
                  <SkeletonShimmer width={32} height={14} />
                </View>
              </View>
            ))
          : cities.map((city, idx) => (
              <Pressable
                key={city.name}
                onPress={() => handleSelectCity(city)}
                accessibilityRole="button"
                accessibilityLabel={`${city.name} · 매칭 ${city.match}%`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm + 4,
                  padding: spacing.sm + 4,
                  borderRadius: radius.cardLarge,
                  backgroundColor: lightColors.bg,
                  borderWidth: 1,
                  borderColor: lightColors.line,
                  marginBottom: spacing.sm + 2,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {/* rec-thumb — 도시 그라데이션 4 종 순환 (design-preview line 646-649). 글자 없이 분위기만. */}
                <LinearGradient
                  colors={REC_GRADIENTS[idx % 4]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    flexShrink: 0,
                  }}
                />

                {/* rec-info */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontFamily: fonts.family.voice,
                      fontSize: 16,
                      fontWeight: '500',
                      color: lightColors.text,
                      marginBottom: 2,
                    }}
                    numberOfLines={1}
                  >
                    {city.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.family.ui,
                      fontSize: 11,
                      lineHeight: 11 * 1.45,
                      color: lightColors.textMuted,
                    }}
                    numberOfLines={2}
                  >
                    {city.reason}
                  </Text>
                </View>

                {/* rec-match */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text
                    style={{
                      fontFamily: fonts.family.numeric,
                      fontStyle: 'italic',
                      fontSize: 18,
                      color: lightColors.celadon,
                      letterSpacing: -0.36,
                    }}
                  >
                    {city.match}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.family.mono,
                      fontSize: 11,
                      color: lightColors.textSoft,
                      marginLeft: 2,
                    }}
                  >
                    %
                  </Text>
                </View>
              </Pressable>
            ))}

        {/* 에러 시 재시도 버튼 */}
        {state.status === 'error' ? (
          <Pressable
            onPress={() => void fetchRecommendation('')}
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

        {/* prompt-input — "더 작은 도시…" + 청자 원형 ↑ send */}
        <View
          style={{
            marginTop: spacing.sm + 6,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: lightColors.bg,
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
            placeholder={'"더 작은 도시…"'}
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
            accessibilityLabel="추가 추천 prompt"
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

        {/* 돌아가기 */}
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back()
            else router.replace('/(tabs)/home')
          }}
          accessibilityRole="button"
          accessibilityLabel="돌아가기"
          style={{
            marginTop: spacing.lg,
            alignSelf: 'center',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: fonts.size.body,
              color: lightColors.textMuted,
            }}
          >
            돌아가기
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}
