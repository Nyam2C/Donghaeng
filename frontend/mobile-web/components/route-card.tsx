import { Pressable, Text, View } from 'react-native'

import type { LLMRoute } from '@trip/types'

import { GradientMiniMap } from '@/components/gradient-mini-map'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * SCENARIO 04 동선 카드 (D29 polish).
 *
 * design-preview line 1743-1799 markup + CSS line 421-455 직역.
 *
 * 레이아웃:
 *  - padding 14px (= spacing.md 미달이라 inline)
 *  - radius 14px (radius.cardLarge)
 *  - border 1px line · 선택 시 border celadon + bg celadonTint
 *  - marginBottom 10px (= spacing.sm + 2 또는 inline)
 *  - route-head: row · space-between · baseline · marginBottom 10
 *  - route-name: Noto Serif KR 15px weight 500, text
 *  - route-letter: Fraunces italic 13px, celadon
 *  - GradientMiniMap (height 56) marginBottom 10
 *  - route-stats: row · gap 14 · DM Mono 11px textMuted, num/label 강조 text
 *
 * design-preview 의 stats 표기:
 *   "{4h} 이동 · {9} stops · {−} 차분함 {★★★}"
 *   = "{num} {label} · {num} {label} · {dash} {moodLabel} {stars}"
 *
 * reason 은 design-preview 카드 안 미표시 — 정직한 일치.
 */

interface RouteCardProps {
  route: LLMRoute
  selected?: boolean
  onPress: () => void
}

/**
 * travelMin → "Nh" 또는 "Nm" 표기 (design-preview 의 "4h" / "3h" / "2h" 패턴).
 *  - 60 이상: round 시간 단위 + "h"
 *  - 60 미만: "{N}m"
 */
function formatHours(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.round(min / 60)
  return `${h}h`
}

function moodStarsText(stars: number): string {
  const safe = Math.max(0, Math.min(5, Math.round(stars)))
  return '★'.repeat(safe)
}

interface StatProps {
  num: string
  label: string
}

function Stat({ num, label }: StatProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text
        style={{
          fontFamily: fonts.family.mono,
          fontSize: 11,
          color: lightColors.text,
        }}
      >
        {num}
      </Text>
      <Text
        style={{
          fontFamily: fonts.family.mono,
          fontSize: 11,
          color: lightColors.textMuted,
          marginLeft: 4,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

interface MoodStatProps {
  moodLabel: string
  stars: number
}

function MoodStat({ moodLabel, stars }: MoodStatProps) {
  const starsText = moodStarsText(stars)
  const hasLabel = moodLabel.length > 0
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text
        style={{
          fontFamily: fonts.family.mono,
          fontSize: 11,
          color: lightColors.textMuted,
        }}
      >
        {'− '}
      </Text>
      {hasLabel ? (
        <Text
          style={{
            fontFamily: fonts.family.mono,
            fontSize: 11,
            color: lightColors.text,
            marginRight: 4,
          }}
        >
          {moodLabel}
        </Text>
      ) : null}
      {starsText.length > 0 ? (
        <Text
          style={{
            fontFamily: fonts.family.mono,
            fontSize: 11,
            color: lightColors.textMuted,
          }}
        >
          {starsText}
        </Text>
      ) : null}
    </View>
  )
}

export function RouteCard({ route, selected = false, onPress }: RouteCardProps) {
  const moodLabel = route.moodLabel ?? ''
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Plan ${route.letter} ${route.name} 동선 선택`}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        padding: 14,
        borderRadius: radius.cardLarge,
        borderWidth: 1,
        borderColor: selected ? lightColors.celadon : lightColors.line,
        backgroundColor: selected ? lightColors.celadonTint : lightColors.bgElev,
        marginBottom: 10,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {/* route-head: name (좌) + Plan letter (우, baseline) */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 15,
            fontWeight: '500',
            color: lightColors.text,
            flex: 1,
            marginRight: spacing.sm,
          }}
          numberOfLines={1}
        >
          {route.name}
        </Text>
        <Text
          style={{
            fontFamily: fonts.family.numeric,
            fontSize: 13,
            fontStyle: 'italic',
            color: lightColors.celadon,
          }}
        >
          Plan {route.letter}
        </Text>
      </View>

      {/* 미니맵 (height 56) */}
      <GradientMiniMap letter={route.letter} style={{ marginBottom: 10 }} />

      {/* route-stats: row · gap 14 · DM Mono */}
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
        <Stat num={formatHours(route.travelMin)} label="이동" />
        <Stat num={`${route.stops.length}`} label="stops" />
        <MoodStat moodLabel={moodLabel} stars={route.moodStars} />
      </View>
    </Pressable>
  )
}
