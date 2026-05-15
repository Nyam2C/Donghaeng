import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { InkMark } from '@/components/ink-mark'
import { TagChip } from '@/components/tag-chip'
import { useTrip } from '@/stores/trip'
import { useUserStyle } from '@/stores/user-style'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * ★ v1 · TRIP START — design-preview line 1814-1890 정확 매핑 (D28 + D33 + D35).
 *
 * 3 경로 동시 제공:
 *  (1) 도시 검색 input + 인기 8 chip → startTrip({city, planning_step:'date_picker'}) (D35 SCENARIO 02.4 진입)
 *  (2) 분위기 4 카드 → setTags([mappedTag]) + push('/plan/recommend') (SCENARIO 02 → DATE PICKER 연결)
 *  (3) 하단 dashed companion 진입점 → push('/plan/new') (SCENARIO 01)
 *
 * D35: chip flow 의 다음 단계는 SCENARIO 02.5 (dates) 가 아니라 SCENARIO 02.4 (date_picker) 로
 * 진입. 사용자가 출발일+박수 결정 → DatePicker "이렇게 가요" → setPlanningStep('dates') →
 * SCENARIO 02.5 (일자별 날씨) → "이렇게 가요" → setPlanningStep('pois') → SCENARIO 03.
 *
 * 분위기 4 카드도 plan/recommend 의 도시 선택 → planning_step:'date_picker' 로 진입하므로
 * 두 경로 모두 일관되게 DATE PICKER 거침.
 *
 * scaffold-freeze D30 명시적 예외. 신규 컴포넌트 1개.
 */

const POPULAR_CITIES = ['강릉', '부산', '제주', '통영', '속초', '여수', '경주', '전주'] as const

interface VibeCard {
  title: string
  hint: string
  tag: string // useUserStyle.tags 에 매핑할 결 1개
}

// 분위기 → 결 1개 매핑 (D28). 결 whitelist 는 SCENARIO 01 의 8 태그 패턴 (plan/new.tsx).
const VIBE_CARDS: readonly VibeCard[] = [
  { title: '바다 보러', hint: '강릉·여수·통영', tag: '자연>도시' },
  { title: '산·자연', hint: '설악·지리·한라', tag: '자연>도시' },
  { title: '도시 골목', hint: '부산·전주·서울', tag: '현지인처럼' },
  { title: '조용히', hint: '통영·하동·태안', tag: '혼자가 좋아요' },
] as const

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoPlusDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}

export function TripStart() {
  const router = useRouter()
  const startTrip = useTrip((s) => s.startTrip)
  const setTags = useUserStyle((s) => s.setTags)
  const [search, setSearch] = useState('')

  // D35 — chip / search 진입 시 SCENARIO 02.4 (DATE PICKER) 로. 2박 3일 default 박힘
  // (DatePicker 가 trip.startDate/endDate 받아 선택 prefill). 사용자가 박수 변경 가능.
  const enterDatePicker = useCallback(
    (city: string) => {
      const trimmed = city.trim()
      if (trimmed.length === 0) return
      startTrip({
        city: trimmed,
        startDate: todayISO(),
        endDate: isoPlusDays(2),
        vibeTags: [],
        planning_step: 'date_picker',
      })
    },
    [startTrip],
  )

  const handleVibePress = useCallback(
    (tag: string) => {
      setTags([tag])
      router.push('/plan/recommend')
    },
    [router, setTags],
  )

  const handleCompanionEntry = useCallback(() => {
    router.push('/plan/new')
  }, [router])

  const handleSearchSubmit = useCallback(() => {
    enterDatePicker(search)
    setSearch('')
  }, [search, enterDatePicker])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: lightColors.bgElev }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md - 2,
        paddingBottom: spacing['2xl'],
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header — ink mark + "윤서님," (사용자명 v1 placeholder) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginTop: spacing.sm,
          marginBottom: spacing.md + 2,
        }}
      >
        <InkMark glow="normal" size={28} />
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 14,
            fontWeight: '500',
            color: lightColors.textMuted,
          }}
        >
          윤서님,
        </Text>
      </View>

      {/* Heading */}
      <Text
        style={{
          fontFamily: fonts.family.voice,
          fontSize: 22,
          fontWeight: '500',
          lineHeight: 22 * 1.35,
          letterSpacing: -0.44,
          color: lightColors.text,
          marginBottom: 6,
        }}
      >
        어디로 <Text style={{ fontStyle: 'italic', color: lightColors.celadon }}>가실래요</Text>?
      </Text>
      <Text
        style={{
          fontFamily: fonts.family.ui,
          fontSize: 12,
          color: lightColors.textSoft,
          marginBottom: spacing.md + 2,
        }}
      >
        도시 이름을 적거나, 분위기로 골라요
      </Text>

      {/* Search input — Phase 4a' 에선 직접 도시 입력 후 enter → SCENARIO 03 진입 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 13,
          paddingHorizontal: 14,
          backgroundColor: lightColors.bg,
          borderWidth: 1,
          borderColor: lightColors.line,
          borderRadius: radius.cardLarge,
          marginBottom: spacing.md + 6,
        }}
      >
        {/* Search 아이콘 — inline SVG 대용 (UI 이모지 금지). 간단한 ⌕ 캐릭터 대신 텍스트 placeholder 만 */}
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: radius.pill,
            borderWidth: 1.6,
            borderColor: lightColors.textSoft,
            marginRight: 2,
          }}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="강릉, 부산, 제주..."
          placeholderTextColor={lightColors.textSoft}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
          style={{
            flex: 1,
            fontFamily: fonts.family.ui,
            fontSize: 14,
            color: lightColors.text,
            padding: 0,
            minHeight: 20,
          }}
          accessibilityLabel="도시 검색"
        />
      </View>

      {/* Section: 인기 도시 */}
      <Text
        style={{
          fontFamily: fonts.family.ui,
          fontSize: 11,
          color: lightColors.textMuted,
          letterSpacing: 0.88,
          marginBottom: 10,
        }}
      >
        인기 도시
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: spacing.md + 6,
        }}
      >
        {POPULAR_CITIES.map((city) => (
          <TagChip key={city} label={city} onPress={() => enterDatePicker(city)} />
        ))}
      </View>

      {/* Section: 분위기로 */}
      <Text
        style={{
          fontFamily: fonts.family.ui,
          fontSize: 11,
          color: lightColors.textMuted,
          letterSpacing: 0.88,
          marginBottom: 10,
        }}
      >
        분위기로
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: spacing.md + 2,
        }}
      >
        {VIBE_CARDS.map((vibe) => (
          <Pressable
            key={vibe.title}
            accessibilityRole="button"
            accessibilityLabel={`${vibe.title} 분위기 선택`}
            onPress={() => handleVibePress(vibe.tag)}
            style={({ pressed }) => ({
              flexBasis: '48%',
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: lightColors.bg,
              borderWidth: 1,
              borderColor: lightColors.line,
              borderRadius: radius.card,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fonts.family.voice,
                fontSize: 14,
                fontWeight: '500',
                color: lightColors.text,
              }}
            >
              {vibe.title}
            </Text>
            <Text
              style={{
                fontFamily: fonts.family.ui,
                fontSize: 11,
                color: lightColors.textSoft,
                marginTop: 2,
              }}
            >
              {vibe.hint}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Footer: companion entry — dashed celadon */}
      <Pressable
        onPress={handleCompanionEntry}
        accessibilityRole="button"
        accessibilityLabel="대화로 추천 받기"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor: lightColors.bg,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: lightColors.celadonSoft,
          borderRadius: radius.card,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ marginTop: 2 }}>
          <InkMark glow="normal" size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 13,
              lineHeight: 13 * 1.5,
              color: lightColors.text,
            }}
          >
            어떤 결의 여행이 좋은지{' '}
            <Text style={{ fontStyle: 'italic', color: lightColors.celadon }}>
              같이 정해볼까요?
            </Text>
          </Text>
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: 11,
              color: lightColors.celadon,
              marginTop: 4,
            }}
          >
            대화로 추천 받기 →
          </Text>
        </View>
      </Pressable>
    </ScrollView>
  )
}
