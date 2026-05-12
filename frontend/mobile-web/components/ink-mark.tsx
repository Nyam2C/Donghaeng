import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import type { Glow } from '@trip/types'

import { lightColors } from '@/theme'

export interface InkMarkProps {
  size: number
  glow: Glow
}

const glowToColor = (glow: Glow): string => {
  switch (glow) {
    case 'normal':
      return lightColors.celadon
    case 'alert':
      return lightColors.amber
    case 'rescue':
      return lightColors.juhong
    case 'away':
      return lightColors.textSoft
  }
}

export function InkMark({ size, glow }: InkMarkProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={6} fill={glowToColor(glow)} opacity={0.85} />
      </Svg>
    </View>
  )
}
