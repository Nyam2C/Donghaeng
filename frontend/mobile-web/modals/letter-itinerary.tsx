import { useRouter } from 'expo-router'
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
import { useShallow } from 'zustand/react/shallow'

import type { LLMLetter, LLMRoute, LLMRouteStop, Trip } from '@trip/types'

import { streamLetter } from '@/services/companion/llm-orchestrator'
import { useSession } from '@/stores/session'
import { useUserStyle } from '@/stores/user-style'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * v1.6 (D38) — ★ SPECIAL · 편지처럼 읽는 일정 (NOT A TIMETABLE)
 *
 * design-preview line 2074-2135 직역.
 *  - letter-header : "{city} · Day N" (Noto Serif KR 22px) + "월/일 · 요일" 메타
 *  - day-tabs      : Day 01/02/03 horizontal (active = celadon underline)
 *  - ink-timeline  : 잉크 점 7개 (07/09/11/13/16/18/21) 위 현재 시간 marker
 *  - letter-body   : friend-tone paragraphs, 1인칭, 시간(DM Mono) + 장소(dotted underline)
 *  - signature     : "— 오늘의 동행" (italic celadon)
 *  - reply         : "↳ 답장 쓰기 · 일정 바꾸고 싶어요" placeholder (v2.1)
 *
 * 시그니처 freeze (D12) 외 — 신규 modal 컴포넌트 1개. D38 명시적 예외.
 * scaffold-guard 패턴: companion-map.tsx (D31) + tts-diary.tsx 와 동일.
 */

const WEEKDAY_KOR = ['일', '월', '화', '수', '목', '금', '토'] as const
const TIMELINE_HOURS = [7, 9, 11, 13, 16, 18, 21] as const

interface LetterItineraryProps {
  visible: boolean
  onClose: () => void
  trip: Trip
  activeRoute: LLMRoute
}

interface DayGroup {
  index: number // 0-based day index
  date: Date
  stops: LLMRouteStop[]
}

/** trip.startDate ~ endDate 사이 day 수 (당일은 1, 1박2일은 2, …) */
function daysInTrip(startDate: string, endDate: string): number {
  const a = new Date(`${startDate}T00:00:00`)
  const b = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1)
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

/** stops 를 dayCount 만큼 균등 분배. 각 day 는 최소 1 stop. */
function groupStopsByDay(stops: LLMRouteStop[], dayCount: number): LLMRouteStop[][] {
  if (dayCount <= 1) return [stops]
  const ordered = [...stops].sort((a, b) => a.order - b.order)
  const perDay = Math.ceil(ordered.length / dayCount)
  const groups: LLMRouteStop[][] = []
  for (let i = 0; i < dayCount; i++) {
    const slice = ordered.slice(i * perDay, (i + 1) * perDay)
    groups.push(slice)
  }
  // tail day 가 비면 마지막 stop 채워서 빈 페이지 회피
  if (groups[groups.length - 1].length === 0 && ordered.length > 0) {
    groups[groups.length - 1] = [ordered[ordered.length - 1]]
  }
  return groups
}

/** "HH:MM" 의 hour 만 추출. 파싱 실패 시 12 (정오). */
function hourOf(timeHint: string | undefined): number {
  if (!timeHint) return 12
  const m = timeHint.match(/^(\d{1,2}):/)
  return m ? Number(m[1]) : 12
}

/** stop 의 표시 이름 — name? 우선, fallback poi_id 끝 segment. */
function displayName(stop: LLMRouteStop): string {
  if (stop.name && stop.name.length > 0) return stop.name
  // "kakao_12345" → "장소" placeholder. id 가 한글이면 그대로 사용 (update-route mock 케이스).
  if (/^[가-힣]/.test(stop.poi_id)) return stop.poi_id
  return '한 곳'
}

/** stop 의 표시 시각 — timeHint? 우선, fallback order 기반. */
function displayTime(stop: LLMRouteStop, totalStops: number): string {
  if (stop.timeHint) return stop.timeHint
  // fallback: 09:00 ~ 20:00 사이 균등 분배
  const span = 11 // hours
  const startHour = 9
  const idx = stop.order - 1
  const h = startHour + Math.round((idx / Math.max(1, totalStops - 1)) * span)
  return `${String(Math.min(23, h)).padStart(2, '0')}:00`
}

/** stop position 별 friend-tone 도입부 변형. */
function paragraphIntro(position: 'first' | 'middle' | 'last', hour: number): string {
  if (position === 'first') {
    if (hour < 10) return '아침은 천천히. '
    if (hour < 12) return '오전엔 가볍게. '
    return '시작은 편하게. '
  }
  if (position === 'last') {
    if (hour >= 18) return '저녁은 마무리하듯. '
    if (hour >= 15) return '오후 끝엔 '
    return '마지막은 '
  }
  // middle
  if (hour < 12) return '이어서 '
  if (hour < 14) return '점심은 가볍게. '
  if (hour < 17) return '이따 '
  return '저녁엔 '
}

/** stop 한 줄 friend-tone 본문. */
function paragraphBody(stop: LLMRouteStop, position: 'first' | 'middle' | 'last'): string {
  if (position === 'first') return '에서 시작해요. 어제 잠은 잘 자셨어요?'
  if (position === 'last') return '에서 마무리해요. 오늘 결 어떠셨어요?'
  return '에 들렸다 갈까요?'
}

function ymdLabel(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 · ${WEEKDAY_KOR[d.getDay()]}요일`
}

// ── D39 v2.1 LLM paragraph marker parser ────────────────────────────
// 본문 paragraph 안의 inline marker:
//   {TIME:HH:MM}   → DM Mono 시간
//   {PLACE:이름}    → italic celadon 장소
//   {EM:강조어}      → italic celadon 강조

interface LetterSegment {
  kind: 'text' | 'time' | 'place' | 'em'
  value: string
}

function parseLetterParagraph(text: string): LetterSegment[] {
  const segments: LetterSegment[] = []
  const regex = /\{(TIME|PLACE|EM):([^}]+)\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null = regex.exec(text)
  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, match.index) })
    }
    const kind = match[1].toLowerCase() as 'time' | 'place' | 'em'
    segments.push({ kind, value: match[2] })
    lastIndex = match.index + match[0].length
    match = regex.exec(text)
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) })
  }
  return segments
}

function LetterParagraph({ text }: { text: string }) {
  const segments = useMemo(() => parseLetterParagraph(text), [text])
  return (
    <Text
      style={{
        fontFamily: fonts.family.voice,
        fontSize: 14,
        lineHeight: 14 * 1.75,
        color: lightColors.text,
        marginBottom: 14,
      }}
    >
      {segments.map((seg, idx) => {
        const key = `${idx}-${seg.kind}-${seg.value.slice(0, 10)}`
        if (seg.kind === 'time') {
          return (
            <Text key={key} style={{ fontFamily: fonts.family.mono, color: lightColors.textSoft }}>
              {seg.value}
            </Text>
          )
        }
        if (seg.kind === 'place' || seg.kind === 'em') {
          return (
            <Text
              key={key}
              style={{
                fontFamily: fonts.family.voice,
                fontStyle: 'italic',
                color: lightColors.celadon,
              }}
            >
              {seg.value}
            </Text>
          )
        }
        return <Text key={key}>{seg.value}</Text>
      })}
    </Text>
  )
}

interface LetterBodyProps {
  stops: LLMRouteStop[]
  cityName: string
  /** D39 v2.1 — LLM 응답. 있으면 paragraphs 사용 (marker parse). 없으면 client template fallback. */
  llmLetter?: LLMLetter | null
}

function LetterBody({ stops, cityName, llmLetter }: LetterBodyProps) {
  // LLM 응답이 있으면 그것 사용 (paragraphs 의 marker parse)
  if (llmLetter && llmLetter.paragraphs.length > 0) {
    return (
      <>
        {llmLetter.paragraphs.map((p, idx) => (
          <LetterParagraph key={`llm-${idx}-${p.slice(0, 12)}`} text={p} />
        ))}
      </>
    )
  }
  // fallback: client-side template (LLM loading / error 시)
  if (stops.length === 0) {
    return (
      <Text
        style={{
          fontFamily: fonts.family.voice,
          fontSize: 14,
          lineHeight: 14 * 1.75,
          color: lightColors.textMuted,
        }}
      >
        오늘은 천천히 쉬어가요. {cityName} 결을 가만히 느끼는 날.
      </Text>
    )
  }
  return (
    <>
      {stops.map((stop, idx) => {
        const position: 'first' | 'middle' | 'last' =
          idx === 0 ? 'first' : idx === stops.length - 1 ? 'last' : 'middle'
        const time = displayTime(stop, stops.length)
        const name = displayName(stop)
        const intro = paragraphIntro(position, hourOf(time))
        const body = paragraphBody(stop, position)
        return (
          <Text
            key={`${stop.order}-${stop.poi_id}`}
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 14,
              lineHeight: 14 * 1.75,
              color: lightColors.text,
              marginBottom: 14,
            }}
          >
            <Text>{intro}</Text>
            <Text style={{ fontFamily: fonts.family.mono, color: lightColors.textSoft }}>
              {time}
            </Text>
            <Text> </Text>
            <Text
              style={{
                fontFamily: fonts.family.voice,
                fontStyle: 'italic',
                color: lightColors.celadon,
              }}
            >
              {name}
            </Text>
            <Text>{body}</Text>
          </Text>
        )
      })}
    </>
  )
}

export function LetterItinerary({ visible, onClose, trip, activeRoute }: LetterItineraryProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const translateY = useSharedValue(1000)
  const [internalVisible, setInternalVisible] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  // D39 v2.1 — LLM letter cache per day index. loading/error 상태 함께.
  const [lettersByDay, setLettersByDay] = useState<Record<number, LLMLetter>>({})
  const [letterLoadingDay, setLetterLoadingDay] = useState<number | null>(null)
  const fetchAbortRef = useRef<AbortController | null>(null)

  const userStyle = useUserStyle(
    useShallow((s) => ({
      tags: s.tags,
      likedPoiIds: s.likedPoiIds,
      dislikedPoiIds: s.dislikedPoiIds,
    })),
  )
  const appendTurn = useSession((s) => s.appendTurn)

  useEffect(() => {
    if (visible) {
      setInternalVisible(true)
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    } else if (internalVisible) {
      translateY.value = withTiming(
        1000,
        { duration: 300, easing: Easing.in(Easing.cubic) },
        (finished) => {
          'worklet'
          if (finished) runOnJS(setInternalVisible)(false)
        },
      )
    }
  }, [visible, internalVisible, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const dayCount = useMemo(
    () => daysInTrip(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate],
  )
  const startDateObj = useMemo(() => new Date(`${trip.startDate}T00:00:00`), [trip.startDate])

  const dayGroups: DayGroup[] = useMemo(() => {
    const grouped = groupStopsByDay(activeRoute.stops, dayCount)
    return grouped.map((stops, index) => ({
      index,
      date: addDays(startDateObj, index),
      stops,
    }))
  }, [activeRoute.stops, dayCount, startDateObj])

  const currentDay = dayGroups[selectedDay] ?? dayGroups[0]

  // D39 v2.1 — selectedDay 변경 시 LLM letter 호출 (캐시 없으면). modal 닫혀있으면 skip.
  useEffect(() => {
    if (!visible || !currentDay) return
    if (lettersByDay[currentDay.index]) return // 캐시 hit
    if (letterLoadingDay === currentDay.index) return // 이미 로딩 중

    fetchAbortRef.current?.abort()
    const controller = new AbortController()
    fetchAbortRef.current = controller
    setLetterLoadingDay(currentDay.index)
    void (async () => {
      try {
        let final: LLMLetter | undefined
        for await (const ev of streamLetter({
          city: trip.city,
          dayIndex: currentDay.index + 1,
          totalDays: dayCount,
          stops: currentDay.stops,
          dateLabel: ymdLabel(currentDay.date),
          userStyle,
        })) {
          if (controller.signal.aborted) return
          if (ev.final) {
            final = ev.final
            break
          }
        }
        if (controller.signal.aborted) return
        if (final) {
          setLettersByDay((prev) => ({ ...prev, [currentDay.index]: final }))
        }
      } catch (err) {
        if (controller.signal.aborted) return
        // 친구 톤 — fallback 은 LetterBody 가 client template 으로 처리
        console.warn('[letter-itinerary] streamLetter 실패:', err)
      } finally {
        if (!controller.signal.aborted) setLetterLoadingDay(null)
      }
    })()

    return () => {
      controller.abort()
    }
  }, [visible, currentDay, lettersByDay, letterLoadingDay, trip.city, dayCount, userStyle])

  // 현재 시각 — 잉크 타임라인의 active dot. trip 의 day index 안에 들어있을 때만 표시.
  const nowHour = new Date().getHours()
  const todayLocalDate = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const isCurrentlyOnSelectedDay = currentDay
    ? currentDay.date.getTime() === todayLocalDate.getTime()
    : false

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // D39 v2.1 — 답장 쓰기: modal 닫고 채팅 탭 진입 + 안내 user turn append.
  // 사용자가 "일정 바꾸고 싶어요" 발화한 것처럼 turn 박아 → 채팅에서 streamChat 이 응답 (자동 X — 사용자가 추가 메시지 입력 시).
  const handleReply = useCallback(() => {
    appendTurn({
      ts: Date.now(),
      speaker: 'user',
      text: '일정 바꾸고 싶어요',
    })
    onClose()
    // modal slide-down 후 navigate (race 회피 위해 짧은 delay)
    setTimeout(() => {
      router.push('/(tabs)/talk')
    }, 320)
  }, [appendTurn, onClose, router])

  const currentLetter = currentDay ? (lettersByDay[currentDay.index] ?? null) : null
  const isLetterLoading = currentDay ? letterLoadingDay === currentDay.index : false

  if (!internalVisible || !currentDay) return null

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
            backgroundColor: lightColors.bg,
          },
          animatedStyle,
        ]}
      >
        <View style={{ paddingTop: insets.top + spacing.sm, flex: 1 }}>
          {/* 닫기 — 좌상단 × */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.sm,
            }}
          >
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="편지 닫기"
              hitSlop={10}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: fonts.family.ui,
                  fontSize: 22,
                  color: lightColors.textMuted,
                  lineHeight: 24,
                }}
              >
                ×
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg + 2,
              paddingBottom: insets.bottom + spacing['2xl'],
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* letter-header */}
            <View style={{ marginBottom: spacing.md + 2 }}>
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 22,
                  fontWeight: '500',
                  lineHeight: 22 * 1.35,
                  letterSpacing: -0.44,
                  color: lightColors.text,
                }}
              >
                {trip.city} · Day {currentDay.index + 1}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.family.mono,
                  fontSize: 11,
                  color: lightColors.textSoft,
                  letterSpacing: 0.04 * 11,
                  marginTop: 4,
                }}
              >
                {ymdLabel(currentDay.date)}
              </Text>
            </View>

            {/* day-tabs */}
            {dayCount > 1 ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  marginBottom: spacing.md + 2,
                }}
              >
                {dayGroups.map((dg) => {
                  const active = dg.index === selectedDay
                  return (
                    <Pressable
                      key={dg.index}
                      onPress={() => setSelectedDay(dg.index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Day ${dg.index + 1}`}
                      accessibilityState={{ selected: active }}
                      hitSlop={6}
                      style={({ pressed }) => ({
                        paddingBottom: 6,
                        borderBottomWidth: active ? 1.5 : 0,
                        borderBottomColor: lightColors.celadon,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.family.mono,
                          fontSize: 11,
                          letterSpacing: 0.08 * 11,
                          color: active ? lightColors.celadon : lightColors.textSoft,
                        }}
                      >
                        DAY {String(dg.index + 1).padStart(2, '0')}
                      </Text>
                      <Text
                        style={{
                          fontFamily: fonts.family.voice,
                          fontSize: 13,
                          color: active ? lightColors.text : lightColors.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {WEEKDAY_KOR[dg.date.getDay()]}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : null}

            {/* ink-timeline */}
            <View style={{ marginBottom: spacing.md + 6 }}>
              <View
                style={{
                  height: 1,
                  backgroundColor: lightColors.line,
                  marginBottom: 8,
                }}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: -12,
                  paddingHorizontal: 4,
                }}
              >
                {TIMELINE_HOURS.map((h) => {
                  const isCurrent = isCurrentlyOnSelectedDay && Math.abs(nowHour - h) <= 1
                  const isPast = isCurrentlyOnSelectedDay && nowHour > h + 1
                  return (
                    <View
                      key={h}
                      style={{
                        width: isCurrent ? 8 : 6,
                        height: isCurrent ? 8 : 6,
                        borderRadius: radius.pill,
                        backgroundColor: isCurrent
                          ? lightColors.celadon
                          : isPast
                            ? lightColors.textSoft
                            : lightColors.lineSoft,
                      }}
                    />
                  )
                })}
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 6,
                  paddingHorizontal: 2,
                }}
              >
                {TIMELINE_HOURS.map((h) => {
                  const isCurrent = isCurrentlyOnSelectedDay && Math.abs(nowHour - h) <= 1
                  return (
                    <Text
                      key={`label-${h}`}
                      style={{
                        fontFamily: fonts.family.mono,
                        fontSize: 9,
                        letterSpacing: 0.04 * 9,
                        color: isCurrent ? lightColors.celadon : lightColors.textSoft,
                      }}
                    >
                      {String(h).padStart(2, '0')}
                    </Text>
                  )
                })}
              </View>
            </View>

            {/* letter-body — D39 v2.1: LLM letter 우선, fallback client template */}
            <View style={{ marginBottom: spacing.lg }}>
              <LetterBody stops={currentDay.stops} cityName={trip.city} llmLetter={currentLetter} />
              {isLetterLoading && !currentLetter ? (
                <Text
                  style={{
                    fontFamily: fonts.family.voice,
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: lightColors.textSoft,
                    marginTop: spacing.xs + 2,
                  }}
                >
                  — 한 호흡 더 다듬는 중이에요…
                </Text>
              ) : null}
            </View>

            {/* signature — LLM 응답에 있으면 그것 사용, 없으면 default */}
            <Text
              style={{
                fontFamily: fonts.family.voice,
                fontSize: 13,
                fontStyle: 'italic',
                color: lightColors.celadon,
                marginBottom: spacing.lg,
              }}
            >
              {currentLetter?.signature ?? '— 오늘의 동행'}
            </Text>

            {/* reply — D39 v2.1: 답장 쓰기 → 채팅 탭 진입 + 안내 turn append */}
            <Pressable
              onPress={handleReply}
              accessibilityRole="button"
              accessibilityLabel="답장 쓰기 · 일정 바꾸고 싶어요"
              hitSlop={6}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: lightColors.celadon,
                  textDecorationLine: 'underline',
                }}
              >
                ↳ 답장 쓰기 · 일정 바꾸고 싶어요
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  )
}
