import { Text, View } from 'react-native'

import type { MomentCard as MomentCardType } from '@trip/types'

import { lightColors } from '@/theme'

export interface MomentCardProps {
  card: MomentCardType
}

export function MomentCard({ card }: MomentCardProps) {
  const isLarge = card.variant === 'large'
  return (
    <View
      style={{
        backgroundColor: lightColors.bgElev,
        borderRadius: 12,
        padding: isLarge ? 20 : 12,
        borderWidth: 1,
        borderColor: lightColors.lineSoft,
      }}
    >
      <Text
        style={{
          color: lightColors.text,
          fontSize: isLarge ? 18 : 14,
          fontFamily: 'NotoSerifKR_500Medium',
        }}
      >
        {card.poi.name}
      </Text>
      <Text style={{ color: lightColors.textMuted, marginTop: 4 }}>{card.note}</Text>
    </View>
  )
}
