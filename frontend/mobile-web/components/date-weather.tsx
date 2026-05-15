import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import Svg, { Circle, Line, Path } from 'react-native-svg'

import type { DayForecast, ForecastResponse, Trip, WeatherCondition } from '@trip/types'

import { InkMark } from '@/components/ink-mark'
import { fetchForecast } from '@/services/weather'
import { useTrip } from '@/stores/trip'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * ★ v1.5 · SCENARIO 02.5 — 날짜 + 일자별 날씨 (D33)
 *
 * design-preview line 2340-2397 markup 을 RN 으로 매핑.
 *  - 헤더: "{city} · 언제 갈까요?" + ink mark (celadon)
 *  - voice 인용: "날씨 같이 봐드릴게요. 둘째 날 비가 좀 있어요." (비 day 있을 때)
 *  - 3 day 가로 row (각 카드: 요일 mono · tempC Fraunces italic · condition SVG · 라벨)
 *  - 비 day (rainProb ≥ 60 또는 condition='rainy') : amber border + amber tint
 *  - 비 안내 카드 : 좌측 amber 보더 + "둘째 날 (M/D) 비 와요. 실내·덮인 곳 위주로…"
 *  - 자유 입력 input (Phase 5+ LLM 통합 전엔 disabled placeholder)
 *  - CTA "이렇게 가요" → useTrip.setPlanningStep('pois') → SCENARIO 03 진입
 *
 * 데이터 흐름:
 *   mount → fetchForecast({city, startDate, endDate}) → useState<ForecastState>
 *   → loading 시 3 카드 placeholder · error 시 친구 톤 + "다시" 버튼
 */

const WEEKDAY_KOR = ['일', '월', '화', '수', '목', '금', '토'] as const
const RAIN_THRESHOLD = 60 // rainProb ≥ 60 또는 condition='rainy' 시 amber 강조
// D39 P3 polish — theme alpha 토큰으로 이동 (3 곳 공통: home / date-weather / letter-itinerary 잠재)
const RAIN_DAY_AMBER_TEXT = lightColors.amberTextDeep
const AMBER_TINT_CARD = lightColors.amberTint
const AMBER_TINT_HINT = lightColors.amberTintSoft

const ORDINAL_KOR = ['', '첫째', '둘째', '셋째', '넷째', '다섯째'] as const

function formatDayLabel(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  const weekday = WEEKDAY_KOR[d.getDay()]
  return `${weekday} · ${d.getMonth() + 1}/${d.getDate()}`
}

function formatShortDate(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function ordinalKor(index1Based: number): string {
  return ORDINAL_KOR[index1Based] ?? `${index1Based}번째`
}

function conditionLabel(
  condition: WeatherCondition,
  rainProb: number,
  isRainyDay: boolean,
): string {
  if (condition === 'rainy' || (condition === 'cloudy' && isRainyDay)) return `비 ${rainProb}%`
  if (condition === 'snowy') return '눈'
  if (condition === 'cloudy') return '흐림'
  return '맑음'
}

function isRainy(d: DayForecast): boolean {
  return d.condition === 'rainy' || d.rainProb >= RAIN_THRESHOLD
}

/**
 * Weather icon — design-preview line 1403-1424 의 i-cloud / i-rain / i-sun path 직역.
 * react-native-svg + currentColor 대신 color prop. stroke 1.6 (theme.stroke.icon).
 */
function WeatherIcon({
  condition,
  size,
  color,
}: {
  condition: WeatherCondition
  size: number
  color: string
}) {
  if (condition === 'rainy') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M17 14a4 4 0 1 0-1.2-7.85A6 6 0 0 0 5 9 4 4 0 0 0 6 16h11"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Line
          x1={9}
          y1={19}
          x2={8}
          y2={22}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Line
          x1={13}
          y1={19}
          x2={12}
          y2={22}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Line
          x1={17}
          y1={19}
          x2={16}
          y2={22}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    )
  }
  if (condition === 'sunny') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
          cx={12}
          cy={12}
          r={4}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Line
          x1={12}
          y1={2}
          x2={12}
          y2={4}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Line
          x1={12}
          y1={20}
          x2={12}
          y2={22}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Line
          x1={4.93}
          y1={4.93}
          x2={6.34}
          y2={6.34}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Line
          x1={17.66}
          y1={17.66}
          x2={19.07}
          y2={19.07}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Line
          x1={2}
          y1={12}
          x2={4}
          y2={12}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Line
          x1={20}
          y1={12}
          x2={22}
          y2={12}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Line
          x1={4.93}
          y1={19.07}
          x2={6.34}
          y2={17.66}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Line
          x1={17.66}
          y1={6.34}
          x2={19.07}
          y2={4.93}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    )
  }
  // cloudy / snowy fallback → cloud path
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.5 19a4.5 4.5 0 1 0-1.3-8.8A6 6 0 0 0 5 12.5 4 4 0 0 0 6 20h11.5z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

type ForecastState =
  | { status: 'loading' }
  | { status: 'ready'; data: ForecastResponse }
  | { status: 'error' }

interface DateWeatherProps {
  trip: Trip
}

export function DateWeather({ trip }: DateWeatherProps) {
  const setPlanningStep = useTrip((s) => s.setPlanningStep)

  const [state, setState] = useState<ForecastState>({ status: 'loading' })
  const [promptText, setPromptText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const loadForecast = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState({ status: 'loading' })
    try {
      const data = await fetchForecast({
        city: trip.city,
        startDate: trip.startDate,
        endDate: trip.endDate,
      })
      if (controller.signal.aborted) return
      setState({ status: 'ready', data })
    } catch (err) {
      if (controller.signal.aborted) return
      // eslint-disable-next-line no-console
      console.warn('[date-weather] forecast 호출 실패:', err)
      setState({ status: 'error' })
    }
  }, [trip.city, trip.startDate, trip.endDate])

  useEffect(() => {
    void loadForecast()
    return () => {
      abortRef.current?.abort()
    }
  }, [loadForecast])

  const days: DayForecast[] = state.status === 'ready' ? state.data.days : []

  // 첫 비 오는 날의 index (0-based) — voice + 비 안내 카드 둘 다 사용
  const firstRainyIdx = useMemo(() => days.findIndex(isRainy), [days])
  const hasRainyDay = firstRainyIdx >= 0
  const rainyDay: DayForecast | undefined = firstRainyIdx >= 0 ? days[firstRainyIdx] : undefined

  const handleConfirm = useCallback(() => {
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
      {/* 헤더: ink mark + "{city} · 언제 갈까요?" */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginTop: spacing.sm + 2,
          marginBottom: spacing.xs + 2,
        }}
      >
        <InkMark glow="normal" size={24} />
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: fonts.size.h1,
            fontWeight: '500',
            color: lightColors.celadon,
          }}
          numberOfLines={1}
        >
          {trip.city} · 언제 갈까요?
        </Text>
      </View>

      {/* voice 인용 — 좌측 2px celadon 보더 + Noto Serif KR */}
      <View
        style={{
          paddingLeft: spacing.md - 4,
          borderLeftWidth: 2,
          borderLeftColor: lightColors.celadon,
          marginBottom: spacing.md + 2,
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
          {state.status === 'loading' ? '날씨 같이 봐드릴게요…' : null}
          {state.status === 'error' ? '날씨를 못 가져왔어요. 다시 한번 볼게요.' : null}
          {state.status === 'ready' && hasRainyDay ? (
            <>
              <Text style={{ color: lightColors.text }}>날씨 같이 봐드릴게요. </Text>
              <Text style={{ fontStyle: 'italic', color: lightColors.celadon }}>
                {ordinalKor(firstRainyIdx + 1)} 날 비
              </Text>
              <Text style={{ color: lightColors.text }}>가 좀 있어요.</Text>
            </>
          ) : null}
          {state.status === 'ready' && !hasRainyDay ? (
            <Text style={{ color: lightColors.text }}>
              날씨 같이 봐드릴게요. 이번엔 날씨 좋아 보여요.
            </Text>
          ) : null}
        </Text>
      </View>

      {/* 3 day 가로 row */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          marginTop: 6,
          marginBottom: spacing.md - 2,
        }}
      >
        {state.status === 'loading'
          ? [0, 1, 2].map((i) => (
              <View
                key={`skel-${i}`}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderWidth: 1,
                  borderColor: lightColors.line,
                  borderRadius: radius.card,
                  backgroundColor: lightColors.lineSoft,
                  minHeight: 96,
                  opacity: 0.55,
                }}
              />
            ))
          : null}

        {state.status === 'ready'
          ? days.map((d) => {
              const rainy = isRainy(d)
              return (
                <View
                  key={d.date}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 8,
                    borderWidth: 1,
                    borderColor: rainy ? lightColors.amber : lightColors.line,
                    backgroundColor: rainy ? AMBER_TINT_CARD : lightColors.bgElev,
                    borderRadius: radius.card,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.family.mono,
                      fontSize: 10,
                      letterSpacing: 0.04 * 10,
                      color: lightColors.textSoft,
                    }}
                  >
                    {formatDayLabel(d.date)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.family.numeric,
                      fontStyle: 'italic',
                      fontSize: 22,
                      color: rainy ? RAIN_DAY_AMBER_TEXT : lightColors.text,
                      marginTop: 4,
                      marginBottom: 4,
                    }}
                  >
                    {d.tempC}
                    <Text style={{ fontSize: 12 }}>°</Text>
                  </Text>
                  <WeatherIcon
                    condition={d.condition}
                    size={20}
                    color={rainy ? RAIN_DAY_AMBER_TEXT : lightColors.textMuted}
                  />
                  <Text
                    style={{
                      fontFamily: fonts.family.voice,
                      fontSize: 11,
                      color: rainy ? RAIN_DAY_AMBER_TEXT : lightColors.textMuted,
                      marginTop: 4,
                    }}
                  >
                    {conditionLabel(d.condition, d.rainProb, rainy)}
                  </Text>
                </View>
              )
            })
          : null}
      </View>

      {/* 비 안내 카드 — 좌측 amber 보더 (비 day 있을 때만) */}
      {state.status === 'ready' && rainyDay ? (
        <View
          style={{
            paddingVertical: 14,
            paddingHorizontal: 14,
            borderLeftWidth: 2,
            borderLeftColor: lightColors.amber,
            backgroundColor: AMBER_TINT_HINT,
            borderTopRightRadius: radius.card,
            borderBottomRightRadius: radius.card,
            marginBottom: spacing.md + 2,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 13,
              lineHeight: 13 * 1.55,
              color: lightColors.text,
            }}
          >
            <Text>
              {ordinalKor(firstRainyIdx + 1)} 날 ({formatShortDate(rainyDay.date)}) 비 와요.{' '}
            </Text>
            <Text style={{ fontStyle: 'italic', color: RAIN_DAY_AMBER_TEXT }}>실내·덮인 곳</Text>
            <Text> 위주로 짜놨어요.</Text>
          </Text>
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 12,
              color: lightColors.textMuted,
              marginTop: 2,
            }}
          >
            — 책방 · 카페 · 미술관 같은 곳
          </Text>
        </View>
      ) : null}

      {/* error retry */}
      {state.status === 'error' ? (
        <Pressable
          onPress={() => void loadForecast()}
          accessibilityRole="button"
          accessibilityLabel="다시 시도"
          style={{
            alignSelf: 'center',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.cardLarge,
            borderWidth: 1,
            borderColor: lightColors.celadon,
            marginBottom: spacing.md,
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

      {/* 자유 입력 input — Phase 4e 엔 단순 placeholder. Phase 5+ LLM 통합 시 활성화 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginBottom: spacing.sm + 2,
        }}
      >
        <View
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: lightColors.line,
            borderRadius: radius.card,
            backgroundColor: lightColors.bg,
          }}
        >
          <TextInput
            value={promptText}
            onChangeText={setPromptText}
            placeholder={'"하루만 갈래요" / "더 머물래요"'}
            placeholderTextColor={lightColors.textSoft}
            editable={false}
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 13,
              fontStyle: 'italic',
              color: lightColors.text,
              padding: 0,
              minHeight: 20,
            }}
            accessibilityLabel="일수 조정 prompt (준비 중)"
          />
        </View>
      </View>

      {/* CTA "이렇게 가요" */}
      <Pressable
        onPress={handleConfirm}
        disabled={state.status === 'loading'}
        accessibilityRole="button"
        accessibilityLabel="이렇게 가요"
        accessibilityState={{ disabled: state.status === 'loading' }}
        style={({ pressed }) => ({
          alignSelf: 'stretch',
          paddingVertical: 14,
          paddingHorizontal: 22,
          borderRadius: radius.cardLarge,
          backgroundColor: state.status === 'loading' ? lightColors.lineSoft : lightColors.celadon,
          opacity: pressed && state.status !== 'loading' ? 0.85 : 1,
          alignItems: 'center',
        })}
      >
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 15,
            fontWeight: '500',
            color: state.status === 'loading' ? lightColors.textSoft : lightColors.bgElev,
          }}
        >
          이렇게 가요
        </Text>
      </Pressable>
    </ScrollView>
  )
}
