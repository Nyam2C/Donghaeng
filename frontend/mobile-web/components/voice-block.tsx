import type { ReactNode } from 'react'
import { View } from 'react-native'

import { lightColors } from '@/theme'

export interface VoiceBlockProps {
  children: ReactNode
  speaker?: 'companion' | 'user'
}

export function VoiceBlock({ children, speaker = 'companion' }: VoiceBlockProps) {
  const borderColor = speaker === 'companion' ? lightColors.celadon : lightColors.line
  return (
    <View
      style={{
        borderLeftWidth: 2,
        borderLeftColor: borderColor,
        paddingLeft: 12,
        paddingVertical: 4,
      }}
    >
      {children}
    </View>
  )
}
