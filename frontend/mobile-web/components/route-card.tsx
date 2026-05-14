import { Pressable, Text, View } from 'react-native'

import type { LLMRoute } from '@trip/types'

import { GradientMiniMap } from '@/components/gradient-mini-map'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * SCENARIO 04 동선 카드 (D29).
 *
 * design-preview line 1743-1799 markup 매핑:
 *  - 카드: bgElev · radius.cardLarge · 그림자 X (DESIGN.md 거품 금지)
 *  - 상단: GradientMiniMap (96 height) — 결별 색만으로 무드 차이
 *  - 본문 row 1: name (NotoSerifKR 22px) + Plan letter (Fraunces italic 28px)
 *  - 본문 row 2: reason (NotoSerifKR 14px muted)
 *  - 본문 row 3: 이동시간 · stops · 무드 별점 (DM Mono + label mix)
 *
 * Pressable 전체 → onPress. selected 일 때 청자 보더 강조 (design-preview의 selected 상태).
 */

interface RouteCardProps {
  route: LLMRoute
  selected?: boolean
  onPress: () => void
}

function formatTravelMin(min: number): string {
  if (min < 60) return `${min}분`
  const h = Math.round(min / 60)
  return `${h}시간`
}

function moodStarsText(stars: number): string {
  const safe = Math.max(0, Math.min(5, Math.round(stars)))
  return '★'.repeat(safe) + '☆'.repeat(5 - safe)
}

export function RouteCard({ route, selected = false, onPress }: RouteCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Plan ${route.letter} ${route.name} 동선 선택`}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        backgroundColor: lightColors.bgElev,
        borderRadius: radius.cardLarge,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? lightColors.celadon : lightColors.line,
        overflow: 'hidden',
        marginBottom: spacing.md,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <GradientMiniMap letter={route.letter} height={96} />

      <View style={{ padding: spacing.md }}>
        {/* row 1: name + Plan letter */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: spacing.xs,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: fonts.size.h1,
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
              fontSize: 18,
              fontStyle: 'italic',
              color: lightColors.celadon,
              letterSpacing: 0.3,
            }}
          >
            Plan {route.letter}
          </Text>
        </View>

        {/* row 2: reason */}
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 14,
            lineHeight: 14 * 1.55,
            color: lightColors.textMuted,
            marginBottom: spacing.sm + 2,
          }}
          numberOfLines={2}
        >
          {route.reason}
        </Text>

        {/* row 3: stats — 이동시간 · stops · 무드 별점 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            flexWrap: 'wrap',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <Text
              style={{
                fontFamily: fonts.family.numeric,
                fontStyle: 'italic',
                fontSize: 15,
                color: lightColors.text,
              }}
            >
              {formatTravelMin(route.travelMin)}
            </Text>
            <Text
              style={{
                fontFamily: fonts.family.ui,
                fontSize: 11,
                color: lightColors.textSoft,
              }}
            >
              이동
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <Text
              style={{
                fontFamily: fonts.family.numeric,
                fontStyle: 'italic',
                fontSize: 15,
                color: lightColors.text,
              }}
            >
              {route.stops.length}
            </Text>
            <Text
              style={{
                fontFamily: fonts.family.ui,
                fontSize: 11,
                color: lightColors.textSoft,
              }}
            >
              stops
            </Text>
          </View>
          <Text
            style={{
              fontFamily: fonts.family.mono,
              fontSize: 11,
              color: lightColors.celadon,
              letterSpacing: 1,
            }}
            accessibilityLabel={`무드 ${route.moodStars} of 5`}
          >
            {moodStarsText(route.moodStars)}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}
