import { useMemo } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { InkMark } from '@/components/ink-mark'
import { TagChip } from '@/components/tag-chip'
import { useSession } from '@/stores/session'
import { useTrip } from '@/stores/trip'
import { useUserStyle } from '@/stores/user-style'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * SHELL C — 프로필 / 나의 자리 (design-preview line 1526-1585 직역 · D39)
 *
 *  - profile-hero : 잉크 마크 큰 (40) + 이름 (Noto Serif KR 24px) + "동행과 함께한 지" 메타
 *  - stat-row    : 3개 숫자 (Fraunces italic) — Trips · Days · Cities
 *  - 나의 여행 결 : useUserStyle.tags chip list (active=celadon)
 *  - 동행 설정   : 4 setting row (key/val 한 줄, "차분한 여성" 같은 placeholder)
 *
 * 시그니처 freeze (D12): 신규 store/route 추가 X. useUserStyle / useTrip / useSession 만 read.
 * 사용자 이름 "윤서" 는 design-preview 예시값 그대로 (v1 데모용 · v2 에 이름 입력 추가 예정).
 */

// design-preview 직역 — 4 row setting (v1 은 placeholder text, v2 에 실 인입)
const SETTING_ROWS: ReadonlyArray<{ key: string; val: string }> = [
  { key: '동행의 이름', val: '아직 없어요' },
  { key: '대화 톤', val: '친근한 존댓말' },
  { key: '알림 빈도', val: '조용히' },
  { key: '목소리 (TTS)', val: '차분한 여성 · v2' },
] as const

const USER_NAME = '윤서'

/** 동행 가입 후 경과 — design-preview "2년 4개월" 직역. v1 은 데모용 고정 문구. */
const PROFILE_SINCE = '동행과 함께한 지 2년 4개월'

export default function Profile() {
  const insets = useSafeAreaInsets()
  const tags = useUserStyle((s) => s.tags)
  const likedPoiIds = useUserStyle((s) => s.likedPoiIds)
  const active = useTrip((s) => s.active)
  const turns = useSession((s) => s.turns)

  // stat 동적 계산 — 실제 사용자 데이터 반영 (없으면 design-preview 기본값)
  const stats = useMemo(() => {
    // Trips = active 있으면 +1 (v1 은 단일 trip, 가벼운 휴리스틱)
    const trips = active ? 1 : 0
    // Days = active 의 박수+1 (당일 1)
    let days = 0
    if (active) {
      const s = new Date(active.startDate).getTime()
      const e = new Date(active.endDate).getTime()
      if (!Number.isNaN(s) && !Number.isNaN(e)) {
        days = Math.max(1, Math.round((e - s) / 86400000) + 1)
      }
    }
    // Cities = active 도시 1개 (v1 단일)
    const cities = active?.city ? 1 : 0
    return { trips, days, cities }
  }, [active])

  // 좋아요 POI count — design-preview 의 stats 외 보조 정보 (v1.7 polish)
  const likedCount = likedPoiIds.length
  const turnsCount = turns.length

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: lightColors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing['2xl'],
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* profile-hero */}
      <View
        style={{
          alignItems: 'center',
          marginBottom: spacing.xl,
        }}
      >
        <InkMark glow="normal" size={40} />
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 24,
            fontWeight: '500',
            color: lightColors.text,
            marginTop: spacing.sm + 2,
            letterSpacing: -0.48,
          }}
        >
          {USER_NAME}
        </Text>
        <Text
          style={{
            fontFamily: fonts.family.ui,
            fontSize: 12,
            color: lightColors.textSoft,
            marginTop: 4,
          }}
        >
          {PROFILE_SINCE}
        </Text>
      </View>

      {/* stat-row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingVertical: spacing.md,
          marginBottom: spacing.xl,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: lightColors.line,
        }}
      >
        <StatItem num={stats.trips} label="Trips" />
        <StatItem num={stats.days} label="Days" />
        <StatItem num={stats.cities} label="Cities" />
      </View>

      {/* 나의 여행 결 */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text
          style={{
            fontFamily: fonts.family.ui,
            fontSize: 11,
            color: lightColors.textMuted,
            letterSpacing: 0.88,
            marginBottom: spacing.sm + 2,
          }}
        >
          나의 여행 결
        </Text>
        {tags.length === 0 ? (
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 13,
              color: lightColors.textMuted,
              fontStyle: 'italic',
            }}
          >
            결을 아직 안 골랐어요. SCENARIO 01 에서 같이 정해봐요.
          </Text>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {tags.map((tag) => (
              <TagChip key={tag} label={tag} active />
            ))}
          </View>
        )}
      </View>

      {/* 동행 설정 */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text
          style={{
            fontFamily: fonts.family.ui,
            fontSize: 11,
            color: lightColors.textMuted,
            letterSpacing: 0.88,
            marginBottom: spacing.sm + 2,
          }}
        >
          동행 설정
        </Text>
        <View
          style={{
            borderRadius: radius.card,
            backgroundColor: lightColors.bgElev,
            borderWidth: 1,
            borderColor: lightColors.line,
          }}
        >
          {SETTING_ROWS.map((row, idx) => (
            <View
              key={row.key}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderBottomWidth: idx < SETTING_ROWS.length - 1 ? 1 : 0,
                borderBottomColor: lightColors.lineSoft,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 13,
                  color: lightColors.text,
                }}
              >
                {row.key}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: lightColors.textSoft,
                }}
              >
                {row.val}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 보조 stats — v1.7 polish (likedCount + turns) */}
      {likedCount > 0 || turnsCount > 0 ? (
        <View
          style={{
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: lightColors.lineSoft,
            flexDirection: 'row',
            gap: spacing.lg,
          }}
        >
          {likedCount > 0 ? (
            <Text
              style={{
                fontFamily: fonts.family.mono,
                fontSize: 11,
                color: lightColors.textSoft,
                letterSpacing: 0.04 * 11,
              }}
            >
              좋아요 {likedCount}곳
            </Text>
          ) : null}
          {turnsCount > 0 ? (
            <Text
              style={{
                fontFamily: fonts.family.mono,
                fontSize: 11,
                color: lightColors.textSoft,
                letterSpacing: 0.04 * 11,
              }}
            >
              대화 {turnsCount}턴
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  )
}

function StatItem({ num, label }: { num: number; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: fonts.family.numeric,
          fontStyle: 'italic',
          fontSize: 32,
          color: lightColors.text,
          letterSpacing: -0.64,
        }}
      >
        {num}
      </Text>
      <Text
        style={{
          fontFamily: fonts.family.mono,
          fontSize: 10,
          color: lightColors.textSoft,
          letterSpacing: 0.04 * 10,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  )
}
