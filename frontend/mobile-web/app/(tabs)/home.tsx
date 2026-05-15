import { LinearGradient } from 'expo-linear-gradient'
import { Link, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Line, Path } from 'react-native-svg'

import type { DayForecast, ForecastResponse, WeatherCondition } from '@trip/types'

import { InkMark } from '@/components/ink-mark'
import { fetchForecast } from '@/services/weather'
import { useSession } from '@/stores/session'
import { useTrip } from '@/stores/trip'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * Home — ★ v1.5 SHELL B' (design-preview line 2536-2611 직역 · D35)
 *
 * 기존 SHELL B 위에 D35 갱신:
 *  - next-trip 갱신: 진행 중 (planning_step==='on_trip') 시 "Day N / Total" + 다음 stop preview
 *  - 3 day 일자별 날씨 위젯 (active 있을 때만 mount · Phase 4e fetchForecast 재사용)
 *  - 최근 대화 진입점 (어제 한 마디 preview · "→ 이어서" · 탭 → /(tabs)/talk)
 *  - quick-grid 2 카드 (단순화 — 새로 짜기 + 동선 보기)
 *  - ambient 가 일자별 날씨 인식 (비 day 있으면 "내일 비 와요. 실내로 바꿔둘게요")
 *
 * 시그니처 freeze (D12): useTrip / fetchForecast 그대로 사용. 신규 store/route 추가 X.
 */

// design-preview 직역 토큰 — D39 P3 polish: theme alpha 토큰 사용
const celadonTint = lightColors.celadonTint
const amberTextDeep = lightColors.amberTextDeep
const amberTint = lightColors.amberTintSoft
const RAIN_THRESHOLD = 60

// 최근 대화 진입점 fallback (turns 비어있을 때만 표시 placeholder)
const RECENT_CHAT_FALLBACK = {
  time: '—:—',
  text: '"여행 시작하면 같이 이야기해요."',
}

/** turn.text 의 따옴표/quotation 정리 + 약간 trim. design-preview "안목 해변 어떠세요?" 패턴. */
function formatRecentChat(text: string): string {
  const t = text.trim()
  if (t.length === 0) return RECENT_CHAT_FALLBACK.text
  // 이미 따옴표 둘러쌌으면 그대로, 아니면 둘러쌈
  if (t.startsWith('"') || t.startsWith('“')) return t
  return `"${t}"`
}

/** ts(ms) → "HH:MM" (24h, 0-pad). */
function formatChatHHMM(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── helpers ─────────────────────────────────────────

type DayProgress = { dayN: number; total: number }

function dayProgress(startDate: string, endDate: string): DayProgress | null {
  const s = new Date(startDate)
  const e = new Date(endDate)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null
  const total = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1)
  const today = new Date()
  const elapsed = Math.floor((today.getTime() - s.getTime()) / 86_400_000) + 1
  const dayN = Math.min(total, Math.max(1, elapsed))
  return { dayN, total }
}

function formatShortDate(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function isRainy(d: DayForecast): boolean {
  return d.condition === 'rainy' || d.rainProb >= RAIN_THRESHOLD
}

// ── tiny WeatherIcon (14x14, design-preview line 2565/2570/2575 직역) ─

function WeatherIconTiny({ condition, color }: { condition: WeatherCondition; color: string }) {
  if (condition === 'rainy') {
    return (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
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
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
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
  // cloudy / snowy → cloud
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
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

// ── QuickAction (기존 SHELL B 와 동일 시각) ─────────

type Dot = { size: 'sm' | 'md' | 'lg'; color?: string; opacity?: number }

type QuickActionProps = {
  href: string
  label: string
  description: string
  dots: Dot[]
}

function dotPx(s: Dot['size']) {
  return s === 'lg' ? 14 : s === 'sm' ? 6 : 10
}

function dotOpacity(d: Dot) {
  if (d.opacity !== undefined) return d.opacity
  if (d.size === 'sm') return 0.55
  if (d.size === 'lg') return 1
  return 0.85
}

function QuickAction({ href, label, description, dots }: QuickActionProps) {
  return (
    <Link href={href as never} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={description}
        style={{
          flex: 1,
          minHeight: 84,
          padding: 14,
          backgroundColor: lightColors.bg,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: lightColors.line,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {dots.map((d, i) => (
            <View
              key={`${d.size}-${d.color ?? 'c'}-${i}`}
              style={{
                width: dotPx(d.size),
                height: dotPx(d.size),
                borderRadius: 999,
                backgroundColor: d.color ?? lightColors.celadon,
                opacity: dotOpacity(d),
              }}
            />
          ))}
        </View>
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 14,
            fontWeight: '500',
            color: lightColors.text,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: lightColors.textSoft,
            lineHeight: 10 * 1.5,
            fontFamily: fonts.family.ui,
          }}
        >
          {description}
        </Text>
      </Pressable>
    </Link>
  )
}

// ── Home ────────────────────────────────────────────

export default function Home() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const active = useTrip((s) => s.active)
  // D39 P3-3 — 최근 대화 진입점: turns 의 마지막 companion turn 표시 (fallback placeholder).
  const turns = useSession((s) => s.turns)
  const lastCompanionTurn = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].speaker === 'companion') return turns[i]
    }
    return null
  }, [turns])

  // 진행 중 여행만 next-trip 카드 + 날씨 위젯 + ambient 인식 활성화
  const isOnTrip = active?.planning_step === 'on_trip'
  const progress = useMemo(
    () => (isOnTrip && active ? dayProgress(active.startDate, active.endDate) : null),
    [isOnTrip, active],
  )

  // 3 day 일자별 날씨 — active 트립 있을 때만 fetch
  const [forecast, setForecast] = useState<ForecastResponse | null>(null)
  const city = active?.city
  const startDate = active?.startDate
  const endDate = active?.endDate

  useEffect(() => {
    if (!city || !startDate || !endDate) {
      setForecast(null)
      return
    }
    let cancelled = false
    fetchForecast({ city, startDate, endDate })
      .then((data) => {
        if (!cancelled) setForecast(data)
      })
      .catch((err) => {
        if (cancelled) return
        // eslint-disable-next-line no-console
        console.warn('[home] forecast 호출 실패:', err)
        setForecast(null)
      })
    return () => {
      cancelled = true
    }
  }, [city, startDate, endDate])

  // 비 day 인식 — ambient 메시지 + 첫 rainy 카드 강조
  const rainyDay: DayForecast | undefined = forecast?.days.find(isRainy)
  const visibleDays: DayForecast[] = forecast?.days.slice(0, 3) ?? []

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: lightColors.bgElev }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* greet — 잉크 마크 + 이름 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginTop: 14,
        }}
      >
        <InkMark size={24} glow="normal" />
        <Text
          style={{
            fontSize: 14,
            color: lightColors.textMuted,
            fontFamily: fonts.family.ui,
          }}
        >
          윤서님
        </Text>
      </View>

      {/* home-meta — 날짜 · 날씨 (DM Mono · 11px · text-soft) */}
      <Text
        style={{
          fontSize: 11,
          color: lightColors.textSoft,
          marginTop: spacing.xs,
          marginBottom: spacing.sm,
          fontFamily: fonts.family.mono,
        }}
      >
        화요일 · 5월 12일 · 흐림 18°
      </Text>

      {/* home-heading — "오늘은 *어떻게* 보내고 싶으세요?" */}
      <Text
        style={{
          fontFamily: fonts.family.voice,
          fontSize: 24,
          fontWeight: '500',
          lineHeight: 24 * 1.4,
          letterSpacing: -0.48,
          marginTop: spacing.xs,
          marginBottom: spacing.lg,
          color: lightColors.text,
        }}
      >
        오늘은{' '}
        <Text
          style={{
            fontFamily: fonts.family.numeric,
            fontStyle: 'italic',
            color: lightColors.celadon,
          }}
        >
          어떻게
        </Text>
        {'\n'}보내고 싶으세요?
      </Text>

      {/* next-trip — 진행 중 (on_trip) vs 예정 분기 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          backgroundColor: celadonTint,
          borderRadius: radius.cardLarge,
          borderWidth: 1,
          borderColor: lightColors.celadonSoft,
          marginBottom: spacing.md,
        }}
      >
        <LinearGradient
          colors={[lightColors.amber, lightColors.juhong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 48, height: 48, borderRadius: 10 }}
        />
        {isOnTrip && active && progress ? (
          <>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 15,
                  fontWeight: '500',
                  color: lightColors.text,
                }}
              >
                {active.city} · Day {progress.dayN} / {progress.total}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: lightColors.celadon,
                  fontFamily: fonts.family.mono,
                  marginTop: 2,
                }}
              >
                안목 해변 → 경포대
              </Text>
            </View>
            <Text
              style={{
                fontFamily: fonts.family.numeric,
                fontStyle: 'italic',
                fontSize: 18,
                color: lightColors.celadon,
              }}
            >
              진행
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: fonts.family.mono,
                  fontStyle: 'normal',
                  opacity: 0.7,
                }}
              >
                중
              </Text>
            </Text>
          </>
        ) : (
          <>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 15,
                  fontWeight: '500',
                  color: lightColors.text,
                }}
              >
                부산 · 2박 3일
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: lightColors.celadon,
                  fontFamily: fonts.family.mono,
                  marginTop: 2,
                }}
              >
                5/24 출발 · KE 1837
              </Text>
            </View>
            <Text
              style={{
                fontFamily: fonts.family.numeric,
                fontStyle: 'italic',
                fontSize: 24,
                color: lightColors.celadon,
              }}
            >
              12
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: fonts.family.mono,
                  fontStyle: 'normal',
                  opacity: 0.7,
                }}
              >
                일 후
              </Text>
            </Text>
          </>
        )}
      </View>

      {/* 3 day 일자별 날씨 위젯 — design-preview line 2561-2577 직역 (active 있을 때만) */}
      {visibleDays.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 6,
            marginBottom: 18,
          }}
        >
          {visibleDays.map((d) => {
            const rainy = isRainy(d)
            return (
              <View
                key={d.date}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 4,
                  borderWidth: 1,
                  borderColor: rainy ? lightColors.amber : lightColors.line,
                  backgroundColor: rainy ? amberTint : lightColors.bg,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.family.mono,
                    fontSize: 9,
                    color: lightColors.textSoft,
                  }}
                >
                  {formatShortDate(d.date)}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.family.numeric,
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: rainy ? amberTextDeep : lightColors.text,
                    marginVertical: 2,
                  }}
                >
                  {d.tempC}°
                </Text>
                <WeatherIconTiny
                  condition={d.condition}
                  color={rainy ? amberTextDeep : lightColors.textMuted}
                />
              </View>
            )
          })}
        </View>
      ) : null}

      {/* 최근 대화 진입점 — design-preview line 2580-2583 직역 */}
      <Pressable
        onPress={() => router.push('/(tabs)/talk')}
        accessibilityRole="button"
        accessibilityLabel="어제의 대화 이어서 보기"
        style={({ pressed }) => ({
          marginBottom: 18,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radius.card,
          backgroundColor: celadonTint,
          borderLeftWidth: 2,
          borderLeftColor: lightColors.celadon,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text
          style={{
            fontFamily: fonts.family.mono,
            fontSize: 10,
            color: lightColors.celadon,
            marginBottom: 4,
          }}
        >
          {lastCompanionTurn ? formatChatHHMM(lastCompanionTurn.ts) : RECENT_CHAT_FALLBACK.time} ·{' '}
          {lastCompanionTurn ? '동행의 한 마디' : '대화 시작 전'}
        </Text>
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 13,
            lineHeight: 13 * 1.55,
            color: lightColors.text,
          }}
          numberOfLines={2}
        >
          {lastCompanionTurn ? formatRecentChat(lastCompanionTurn.text) : RECENT_CHAT_FALLBACK.text}{' '}
          <Text
            style={{
              color: lightColors.textSoft,
              fontSize: 11,
              fontStyle: 'italic',
            }}
          >
            → 이어서
          </Text>
        </Text>
      </Pressable>

      {/* quick-grid — 2 카드 단순화 (새로 짜기 + 동선 보기) */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <QuickAction
          href="/plan/new"
          label="새로 짜기"
          description="처음부터 동행과 함께"
          dots={[{ size: 'lg' }, { size: 'sm' }]}
        />
        <QuickAction
          href="/(tabs)/travel"
          label="동선 보기"
          description="오늘 갈 곳 한 눈에"
          dots={[{ size: 'md' }, { size: 'md' }, { size: 'sm' }]}
        />
      </View>

      {/* ambient — 일자별 날씨 인식 (비 day 있으면 amber 톤 메시지) */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
          padding: 12,
          paddingHorizontal: 14,
          backgroundColor: lightColors.bg,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: lightColors.line,
          marginTop: spacing.sm,
        }}
      >
        <View style={{ marginTop: 2 }}>
          <InkMark size={20} glow="normal" />
        </View>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.family.voice,
            fontSize: 13,
            lineHeight: 13 * 1.55,
            color: lightColors.text,
          }}
        >
          {rainyDay ? (
            <>
              내일 비 와요.{' '}
              <Text
                style={{
                  color: lightColors.celadon,
                  fontStyle: 'italic',
                  fontFamily: fonts.family.numeric,
                }}
              >
                실내로 바꿔둘게요.
              </Text>
            </>
          ) : (
            <>
              어제 강릉 정리해뒀어요.{' '}
              <Text
                style={{
                  color: lightColors.celadon,
                  fontStyle: 'italic',
                  fontFamily: fonts.family.numeric,
                }}
              >
                한 번 봐주세요.
              </Text>
            </>
          )}
        </Text>
      </View>
    </ScrollView>
  )
}
