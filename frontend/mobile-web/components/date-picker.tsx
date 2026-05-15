import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import type { Trip } from '@trip/types'

import { InkMark } from '@/components/ink-mark'
import { useTrip } from '@/stores/trip'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * ★ v1.5 · SCENARIO 02.4 — DATE PICKER (D35)
 *
 * design-preview SCENARIO 02.4 markup 매핑. TRIP START 의 도시 선택 후, SCENARIO 02.5
 * (일자별 날씨) 진입 전 단계. "몇 박 며칠" 사용자가 직접 결정.
 *
 *  - 헤더: 잉크 마크 (celadon) + "{city} · 며칠 머물래요?"
 *  - voice 인용: "언제, 몇 박으로?"
 *  - 출발일 horizontal scroll : 오늘 ~ +30일 (31 카드)
 *      카드 = 요일 (DM Mono 9px) + 일 (Fraunces italic 18px) + 월 (Noto Serif 11px)
 *      selected = celadon border + celadonTint bg
 *  - 박수 chip row : 당일 / 1박 2일 / 2박 3일 / 3박 4일 / 4박 5일
 *      selected = celadon fill + bgElev label (TagChip active 와 동일 패턴)
 *  - 미리보기: "5월 14일 (화) ~ 5월 16일 (목) · 2박 3일" (당일은 단일 날짜)
 *  - CTA "이렇게 가요" → useTrip.startTrip({ ...trip, startDate, endDate, planning_step:'dates' })
 *
 * 데이터 흐름:
 *   active.startDate / endDate 의 default = TRIP START 가 박은 오늘 + 2박 3일.
 *   사용자가 변경하면 startTrip 으로 trip 갱신 (planning_step='dates' 로 다음 단계 진입).
 */

const POPULAR_DATE_COUNT = 31 // 오늘 + 0..30
const WEEKDAY_KOR = ['일', '월', '화', '수', '목', '금', '토'] as const
const MONTH_KOR = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
] as const

interface NightsOption {
  /** 0 = 당일, 1 = 1박 2일, 2 = 2박 3일, … */
  nights: number
  label: string
}

const NIGHTS_OPTIONS: readonly NightsOption[] = [
  { nights: 0, label: '당일' },
  { nights: 1, label: '1박 2일' },
  { nights: 2, label: '2박 3일' },
  { nights: 3, label: '3박 4일' },
  { nights: 4, label: '4박 5일' },
] as const

function toISODate(d: Date): string {
  // 로컬 기준 YYYY-MM-DD (UTC offset 으로 인한 하루 밀림 방지)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISODate(iso: string): Date | null {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function diffDays(start: string, end: string): number {
  const a = parseISODate(start)
  const b = parseISODate(end)
  if (!a || !b) return 0
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function formatPreviewDate(d: Date): string {
  return `${MONTH_KOR[d.getMonth()]} ${d.getDate()}일 (${WEEKDAY_KOR[d.getDay()]})`
}

interface DatePickerProps {
  trip: Trip
}

export function DatePicker({ trip }: DatePickerProps) {
  const startTrip = useTrip((s) => s.startTrip)

  // 초기 selected = trip.startDate (TRIP START 가 박은 오늘) 또는 오늘
  const today = useMemo(() => startOfToday(), [])
  const [selectedStartISO, setSelectedStartISO] = useState<string>(
    () => trip.startDate || toISODate(today),
  )
  // 초기 박수 = trip.endDate - startDate. 없거나 음수면 2박.
  const [selectedNights, setSelectedNights] = useState<number>(() => {
    const n = diffDays(trip.startDate, trip.endDate)
    if (n >= 0 && n <= 4) return n
    return 2
  })

  const dateCards = useMemo(() => {
    return Array.from({ length: POPULAR_DATE_COUNT }, (_, i) => {
      const d = addDays(today, i)
      return {
        iso: toISODate(d),
        date: d,
      }
    })
  }, [today])

  const startDate = parseISODate(selectedStartISO) ?? today
  const endDate = addDays(startDate, selectedNights)

  const previewText =
    selectedNights === 0
      ? `${formatPreviewDate(startDate)} · 당일`
      : `${formatPreviewDate(startDate)} ~ ${formatPreviewDate(endDate)} · ${selectedNights}박 ${selectedNights + 1}일`

  const handleConfirm = useCallback(() => {
    startTrip({
      ...trip,
      startDate: toISODate(startDate),
      endDate: toISODate(endDate),
      planning_step: 'dates',
    })
  }, [startTrip, trip, startDate, endDate])

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
      {/* 헤더 — ink mark (celadon) + "{city} · 며칠 머물래요?" */}
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
          {trip.city} · 며칠 머물래요?
        </Text>
      </View>

      {/* voice 인용 */}
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
          <Text style={{ fontStyle: 'italic', color: lightColors.celadon }}>언제</Text>
          <Text>, </Text>
          <Text style={{ fontStyle: 'italic', color: lightColors.celadon }}>몇 박</Text>
          <Text>으로?</Text>
        </Text>
      </View>

      {/* 출발일 horizontal scroll calendar */}
      <Text
        style={{
          fontFamily: fonts.family.ui,
          fontSize: 11,
          color: lightColors.textMuted,
          letterSpacing: 0.88,
          marginBottom: 10,
        }}
      >
        출발일
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: spacing.lg }}
        style={{
          marginBottom: spacing.md + 2,
          marginHorizontal: -spacing.lg,
          paddingLeft: spacing.lg,
        }}
      >
        {dateCards.map(({ iso, date }) => {
          const isSelected = iso === selectedStartISO
          return (
            <Pressable
              key={iso}
              onPress={() => setSelectedStartISO(iso)}
              accessibilityRole="button"
              accessibilityLabel={`${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_KOR[date.getDay()]}요일`}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => ({
                width: 56,
                paddingVertical: 12,
                paddingHorizontal: 6,
                borderRadius: radius.card,
                borderWidth: isSelected ? 1.5 : 1,
                borderColor: isSelected ? lightColors.celadon : lightColors.line,
                backgroundColor: isSelected ? lightColors.celadonTint : lightColors.bg,
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: fonts.family.mono,
                  fontSize: 9,
                  color: lightColors.textSoft,
                  letterSpacing: 0.04 * 9,
                  marginBottom: 2,
                }}
              >
                {WEEKDAY_KOR[date.getDay()]}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.family.numeric,
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: isSelected ? lightColors.celadon : lightColors.text,
                  marginBottom: 2,
                }}
              >
                {date.getDate()}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 11,
                  color: isSelected ? lightColors.celadon : lightColors.textMuted,
                }}
              >
                {MONTH_KOR[date.getMonth()]}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* 박수 chip row */}
      <Text
        style={{
          fontFamily: fonts.family.ui,
          fontSize: 11,
          color: lightColors.textMuted,
          letterSpacing: 0.88,
          marginBottom: 10,
        }}
      >
        며칠
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: spacing.md + 2,
        }}
      >
        {NIGHTS_OPTIONS.map((opt) => {
          const isSelected = opt.nights === selectedNights
          return (
            <Pressable
              key={opt.nights}
              onPress={() => setSelectedNights(opt.nights)}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: isSelected }}
              hitSlop={6}
              style={({ pressed }) => ({
                minHeight: 44,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.small,
                borderWidth: isSelected ? 1.5 : 1,
                borderColor: isSelected ? lightColors.celadon : lightColors.line,
                backgroundColor: isSelected ? lightColors.celadon : lightColors.bg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: fonts.family.ui,
                  fontSize: fonts.size.body,
                  fontWeight: isSelected ? '500' : '400',
                  color: isSelected ? lightColors.bgElev : lightColors.text,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* 미리보기 — 친구 톤 한 줄 */}
      <View
        style={{
          paddingVertical: 14,
          paddingHorizontal: 14,
          borderRadius: radius.card,
          backgroundColor: lightColors.celadonTint,
          marginBottom: spacing.md + 6,
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
          {previewText}
        </Text>
      </View>

      {/* CTA */}
      <Pressable
        onPress={handleConfirm}
        accessibilityRole="button"
        accessibilityLabel="이렇게 가요"
        style={({ pressed }) => ({
          alignSelf: 'stretch',
          paddingVertical: 14,
          paddingHorizontal: 22,
          borderRadius: radius.cardLarge,
          backgroundColor: lightColors.celadon,
          opacity: pressed ? 0.85 : 1,
          alignItems: 'center',
        })}
      >
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 15,
            fontWeight: '500',
            color: lightColors.bgElev,
          }}
        >
          이렇게 가요
        </Text>
      </Pressable>
    </ScrollView>
  )
}
