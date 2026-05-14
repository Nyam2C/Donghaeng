import { Text, View } from 'react-native'

import type { MomentCard as MomentCardType } from '@trip/types'

import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing, stroke } from '@/theme/spacing'

export interface MomentCardProps {
  card: MomentCardType
  /**
   * ALERT 배너 카피 (옵션). 미지정 시 type 별 기본 카피.
   * 예: "비가 와요 — 실내 추천", "여기 닫혔어요 — 대안 있어요"
   */
  alertCopy?: string
}

/**
 * Moment card — 현장 컴패니언 4 카드 타입 (NORMAL · ALERT · RESCUE · AWAY)
 *
 * 톤 룰 (DESIGN.md):
 *  - 12-14px radius. 18px+ 거품 radius 금지
 *  - hardcoded hex X — lightColors 토큰만
 *  - 이모지 X (UI 이모지 절대 금지)
 *  - voice 인용 (note) = Noto Serif KR, 좌측 2px 청자 보더
 *
 * variant=large: 큰 카드 (note 18px voice + 푸근한 padding)
 * variant=compact: 작은 카드 (note 14px UI)
 */
export function MomentCard({ card, alertCopy }: MomentCardProps) {
  const isLarge = card.variant === 'large'
  const isAlert = card.type === 'ALERT'
  const isRescue = card.type === 'RESCUE'
  const isAway = card.type === 'AWAY'

  // 카드 borderColor: NORMAL=lineSoft / ALERT=amber / RESCUE=juhong / AWAY=line
  let borderColor: string = lightColors.lineSoft
  if (isAlert) borderColor = lightColors.amber
  else if (isRescue) borderColor = lightColors.juhong
  else if (isAway) borderColor = lightColors.line

  // RESCUE 만 2px 강조, 나머지는 1px
  const borderWidth = isRescue ? 2 : 1

  // AWAY 는 dimmed
  const containerOpacity = isAway ? 0.55 : 1

  return (
    <View style={{ opacity: containerOpacity }}>
      {isAlert ? (
        <View
          style={{
            backgroundColor: lightColors.amber,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
            borderTopLeftRadius: radius.card,
            borderTopRightRadius: radius.card,
          }}
        >
          <Text
            style={{
              color: lightColors.text,
              fontFamily: fonts.family.ui,
              fontSize: fonts.size.caption,
              fontWeight: fonts.weight.medium,
            }}
          >
            {alertCopy ?? '잠깐, 알려줄 게 있어요'}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          backgroundColor: lightColors.bgElev,
          borderRadius: radius.card,
          borderTopLeftRadius: isAlert ? 0 : radius.card,
          borderTopRightRadius: isAlert ? 0 : radius.card,
          padding: isLarge ? spacing.lg : spacing.md,
          borderWidth,
          borderColor,
        }}
      >
        <Text
          style={{
            color: lightColors.text,
            fontSize: isLarge ? fonts.size.h2 : fonts.size.body,
            fontFamily: fonts.family.voice,
            lineHeight: (isLarge ? fonts.size.h2 : fonts.size.body) * fonts.lineHeight.h2,
          }}
        >
          {card.poi.name}
        </Text>
        <Text
          style={{
            color: lightColors.textMuted,
            fontFamily: fonts.family.ui,
            fontSize: fonts.size.caption,
            marginTop: spacing.xxs,
          }}
        >
          {card.poi.address}
        </Text>

        {/* voice 인용 — note 텍스트. 좌측 2px 청자 보더 + Noto Serif KR */}
        <View
          style={{
            marginTop: spacing.md,
            paddingLeft: spacing.md,
            borderLeftWidth: stroke.voiceBorder,
            borderLeftColor: lightColors.celadon,
          }}
        >
          <Text
            style={{
              color: lightColors.text,
              fontFamily: fonts.family.voice,
              fontSize: isLarge ? fonts.size.bodyLarge : fonts.size.body,
              lineHeight:
                (isLarge ? fonts.size.bodyLarge : fonts.size.body) * fonts.lineHeight.voice,
            }}
          >
            {card.note}
          </Text>
        </View>
      </View>
    </View>
  )
}
