import Svg, { Line, Path, Rect } from 'react-native-svg'

import { lightColors } from '@/theme'

export interface IconProps {
  size?: number
  color?: string
}

/**
 * Mic icon — design-preview line 1329-1334 `#i-mic` symbol 직역.
 * stroke=1.6 (DESIGN.md icon stroke 표준), linecap/linejoin=round.
 *
 * 사용처: SCENARIO 07-CHAT 우상단 mic 토글 (visual disabled · v2 음성 진입점, D32).
 */
export function MicIcon({ size = 24, color = lightColors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={9}
        y={3}
        width={6}
        height={12}
        rx={3}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 11v1a7 7 0 0 0 14 0v-1"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={12}
        y1={19}
        x2={12}
        y2={22}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Line x1={9} y1={22} x2={15} y2={22} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  )
}
