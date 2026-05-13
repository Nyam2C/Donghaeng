import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { InkMark } from '@/components/ink-mark'
import { TagChip } from '@/components/tag-chip'
import { streamRecommendation } from '@/services/companion/llm-orchestrator'
import { searchCity } from '@/services/poi'
import { useTrip } from '@/stores/trip'
import { useUserStyle } from '@/stores/user-style'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

import type { KakaoPOI } from '@trip/types'

/**
 * Phase 3 — 간단 일정 시작 (Shell A)
 *
 * 3 input:
 *  ① 도시 검색  (services/poi.searchCity → 자동완성)
 *  ② 날짜       (web: <input type="date"> · native: YYYY-MM-DD text input)
 *  ③ 결 태그    (TagChip 다중 선택 · 7 preset)
 *
 * "시작" 버튼 → trip 정보 + utterance 조립 → streamRecommendation → 첫 LLM 멘트 표시.
 *
 * DESIGN.md 토큰만:
 *  - 한지 배경 · 청자 accent · 먹 본문
 *  - heading: Noto Serif KR · em italic celadon = Fraunces italic
 *  - meta/date: DM Mono
 *  - 거품 radius 금지 (small=8 · card=12 · cardLarge=14 · pill=999 만)
 */

// 결 태그 preset (DESIGN.md 결 모티프 + WEDGE 도시 vibe)
const VIBE_PRESETS = ['조용한', '활발한', '예술적', '맛집', '골목', '한옥', '야경'] as const

// 자동완성 디바운스 (ms)
const SEARCH_DEBOUNCE = 250

// ISO date (YYYY-MM-DD) 형식 단순 validation
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default function PlanNew() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const startTrip = useTrip((s) => s.startTrip)
  // selector 는 primitive/array 별 분리 — object literal 매번 새로 만들면 zustand 가 매 렌더 트리거함
  const userTags = useUserStyle((s) => s.tags)
  const userLikedPoiIds = useUserStyle((s) => s.likedPoiIds)
  const userDislikedPoiIds = useUserStyle((s) => s.dislikedPoiIds)
  const userStyle = useMemo(
    () => ({
      tags: userTags,
      likedPoiIds: userLikedPoiIds,
      dislikedPoiIds: userDislikedPoiIds,
    }),
    [userTags, userLikedPoiIds, userDislikedPoiIds],
  )

  const [cityQuery, setCityQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState<KakaoPOI | null>(null)
  const [suggestions, setSuggestions] = useState<KakaoPOI[]>([])
  const [searching, setSearching] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [vibes, setVibes] = useState<string[]>([])

  const [streamingNote, setStreamingNote] = useState('')
  const [streamingError, setStreamingError] = useState<string | null>(null)
  const [streaming, setStreaming] = useState(false)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQueryRef = useRef<string>('')

  // 도시 자동완성 — 디바운스 후 searchCity 호출
  useEffect(() => {
    if (selectedCity && selectedCity.name === cityQuery) {
      // 사용자가 자동완성을 선택해서 input 값과 일치 → 추가 검색 X
      setSuggestions([])
      return
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (cityQuery.trim().length === 0) {
      setSuggestions([])
      setSearching(false)
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      const q = cityQuery.trim()
      lastQueryRef.current = q
      setSearching(true)
      try {
        const res = await searchCity(q)
        // 사용자가 그 사이 새 키 입력 → stale 결과 버림
        if (lastQueryRef.current === q) {
          setSuggestions(res)
        }
      } catch {
        if (lastQueryRef.current === q) setSuggestions([])
      } finally {
        if (lastQueryRef.current === q) setSearching(false)
      }
    }, SEARCH_DEBOUNCE)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [cityQuery, selectedCity])

  const toggleVibe = useCallback((tag: string) => {
    setVibes((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }, [])

  const canStart = useMemo(() => {
    if (!selectedCity) return false
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) return false
    if (startDate > endDate) return false
    return true
  }, [selectedCity, startDate, endDate])

  const handleStart = useCallback(async () => {
    if (!selectedCity || !canStart || streaming) return
    const trip = {
      city: selectedCity.name,
      startDate,
      endDate,
      vibeTags: vibes,
    }
    startTrip(trip)

    setStreaming(true)
    setStreamingError(null)
    setStreamingNote('')

    const utterance = buildUtterance(trip)
    try {
      const gen = streamRecommendation({
        userStyle,
        utterance,
        candidatePois: [selectedCity], // Phase 3 — 검색한 city POI 1개만. Phase 4 GPS 도입 시 nearbyPois 합류.
      })
      for await (const ev of gen) {
        if (ev.chunk) {
          setStreamingNote((prev) => prev + ev.chunk)
        }
        if (ev.final) {
          // final note 가 chunk 누적과 다를 수 있음 (mock/server 모두). final 로 덮어쓰기.
          setStreamingNote(ev.final.note)
        }
      }
    } catch (err) {
      setStreamingError(err instanceof Error ? err.message : String(err))
    } finally {
      setStreaming(false)
    }
  }, [selectedCity, canStart, streaming, startDate, endDate, vibes, startTrip, userStyle])

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/home')
  }, [router])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: lightColors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing['2xl'],
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* 헤더 — InkMark + 인사 한 줄 */}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm }}
      >
        <InkMark size={24} glow="normal" />
        <Text
          style={{
            fontFamily: fonts.family.ui,
            fontSize: fonts.size.body,
            color: lightColors.textMuted,
          }}
        >
          새로 짜기
        </Text>
      </View>

      {/* Voice heading — "어디로 가실까요?" + em italic celadon */}
      <Text
        style={{
          fontFamily: fonts.family.voice,
          fontSize: 24,
          fontWeight: '500',
          lineHeight: 24 * fonts.lineHeight.voice,
          letterSpacing: -0.48,
          color: lightColors.text,
          marginBottom: spacing.lg,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.family.numeric,
            fontStyle: 'italic',
            color: lightColors.celadon,
          }}
        >
          어디로
        </Text>{' '}
        가실까요?
      </Text>

      {/* ① 도시 — 검색 + 자동완성 */}
      <FieldLabel>도시</FieldLabel>
      <TextInput
        value={cityQuery}
        onChangeText={(t) => {
          setCityQuery(t)
          if (selectedCity && t !== selectedCity.name) setSelectedCity(null)
        }}
        placeholder="강남, 부산, 강릉…"
        placeholderTextColor={lightColors.textSoft}
        style={inputStyle}
        accessibilityLabel="도시 검색"
        returnKeyType="search"
      />
      {searching && (
        <View style={{ marginTop: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color={lightColors.celadon} />
          <Text style={metaTextStyle}>찾는 중…</Text>
        </View>
      )}
      {suggestions.length > 0 && !selectedCity && (
        <View
          style={{
            marginTop: spacing.xs,
            backgroundColor: lightColors.bgElev,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: lightColors.line,
            overflow: 'hidden',
          }}
        >
          {suggestions.slice(0, 5).map((p, idx) => (
            <Pressable
              key={p.id}
              onPress={() => {
                setSelectedCity(p)
                setCityQuery(p.name)
                setSuggestions([])
              }}
              accessibilityRole="button"
              accessibilityLabel={`${p.name} 선택`}
              style={({ pressed }) => ({
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: spacing.md,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: lightColors.lineSoft,
                backgroundColor: pressed ? lightColors.bg : 'transparent',
              })}
            >
              <Text
                style={{
                  fontFamily: fonts.family.ui,
                  fontSize: fonts.size.bodyLarge,
                  color: lightColors.text,
                }}
              >
                {p.name}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.family.mono,
                  fontSize: fonts.size.caption,
                  color: lightColors.textSoft,
                  marginTop: 2,
                }}
              >
                {p.address}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ② 날짜 — start / end */}
      <View style={{ marginTop: spacing.lg }}>
        <FieldLabel>언제</FieldLabel>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <DateField value={startDate} onChange={setStartDate} label="시작" />
          <DateField value={endDate} onChange={setEndDate} label="끝" />
        </View>
        {startDate && endDate && startDate > endDate && (
          <Text style={[metaTextStyle, { color: lightColors.juhong, marginTop: spacing.xs }]}>
            시작일이 끝일보다 늦어요
          </Text>
        )}
      </View>

      {/* ③ 결 태그 — 다중 선택 */}
      <View style={{ marginTop: spacing.lg }}>
        <FieldLabel>어떤 결</FieldLabel>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
          }}
        >
          {VIBE_PRESETS.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              active={vibes.includes(tag)}
              onPress={() => toggleVibe(tag)}
            />
          ))}
        </View>
      </View>

      {/* "시작" CTA */}
      <Pressable
        onPress={handleStart}
        disabled={!canStart || streaming}
        accessibilityRole="button"
        accessibilityLabel="시작"
        accessibilityState={{ disabled: !canStart || streaming }}
        style={{
          marginTop: spacing.xl,
          paddingVertical: spacing.md,
          borderRadius: radius.pill,
          backgroundColor: !canStart || streaming ? lightColors.celadonSoft : lightColors.celadon,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
          opacity: !canStart || streaming ? 0.7 : 1,
        }}
      >
        {streaming ? (
          <ActivityIndicator size="small" color={lightColors.bgElev} />
        ) : (
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: fonts.size.bodyLarge,
              fontWeight: '500',
              color: lightColors.bgElev,
            }}
          >
            시작
          </Text>
        )}
      </Pressable>

      {/* 첫 LLM 멘트 — 음성 인용 패턴 (좌측 청자 2px 보더 + Noto Serif KR) */}
      {(streamingNote || streamingError) && (
        <View
          style={{
            marginTop: spacing.xl,
            paddingLeft: spacing.md,
            paddingVertical: spacing.sm,
            borderLeftWidth: 2,
            borderLeftColor: streamingError ? lightColors.juhong : lightColors.celadon,
            backgroundColor: 'transparent',
          }}
        >
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: fonts.size.bodyLarge,
              lineHeight: fonts.size.bodyLarge * fonts.lineHeight.voice,
              color: streamingError ? lightColors.juhong : lightColors.text,
            }}
          >
            {streamingError ? `잠깐만요 — ${streamingError}` : streamingNote}
          </Text>
        </View>
      )}

      {/* 돌아가기 — 작은 secondary */}
      <Pressable
        onPress={handleBack}
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
  )
}

// ── 보조 컴포넌트 ──────────────────────────────────────────

function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: fonts.family.ui,
        fontSize: fonts.size.caption,
        color: lightColors.textMuted,
        marginBottom: spacing.xs,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </Text>
  )
}

interface DateFieldProps {
  value: string
  onChange: (v: string) => void
  label: string
}

/**
 * web: <input type="date"> 네이티브 위젯 사용 (react-native-web 가 TextInput 의 type prop 을 underlying input 에 전달)
 * native: 단순 TextInput (YYYY-MM-DD)
 *
 * 새 의존성 추가 (DateTimePicker) 없이 v1 단순 처리. native picker 는 v2 폴리시.
 */
function DateField({ value, onChange, label }: DateFieldProps) {
  const isWeb = Platform.OS === 'web'
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontFamily: fonts.family.mono,
          fontSize: fonts.size.caption,
          color: lightColors.textSoft,
          marginBottom: spacing.xxs,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={lightColors.textSoft}
        // react-native-web 은 unknown prop 을 DOM 으로 forward. type=date 이면 native date picker
        {...(isWeb ? ({ type: 'date' } as unknown as object) : {})}
        keyboardType={isWeb ? 'default' : 'numbers-and-punctuation'}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={`${label} 날짜`}
        style={inputStyle}
      />
    </View>
  )
}

// ── 스타일 토큰 ──────────────────────────────────────────

const inputStyle = {
  paddingVertical: spacing.sm + 2,
  paddingHorizontal: spacing.md,
  backgroundColor: lightColors.bgElev,
  borderRadius: radius.card,
  borderWidth: 1,
  borderColor: lightColors.line,
  color: lightColors.text,
  fontFamily: fonts.family.ui,
  fontSize: fonts.size.bodyLarge,
  minHeight: 44,
} as const

const metaTextStyle = {
  fontFamily: fonts.family.mono,
  fontSize: fonts.size.caption,
  color: lightColors.textSoft,
} as const

// ── 헬퍼 ──────────────────────────────────────────

function buildUtterance(trip: {
  city: string
  startDate: string
  endDate: string
  vibeTags: string[]
}): string {
  const vibePart = trip.vibeTags.length > 0 ? `${trip.vibeTags.join(', ')} 결로` : '편안하게'
  return `${trip.city}에서 ${trip.startDate}부터 ${trip.endDate}까지, ${vibePart} 보내고 싶어요.`
}
