import Svg, { Path } from 'react-native-svg'

import { lightColors } from '@/theme'

export interface IconProps {
  size?: number
  color?: string
}

export function KeyboardIcon({ size = 24, color = lightColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  )
}
