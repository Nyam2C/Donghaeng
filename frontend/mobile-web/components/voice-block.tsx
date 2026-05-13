import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { spacing, stroke } from '@/theme/spacing'

/**
 * VoiceBlock — 음성 인용 블록 (DESIGN.md 라인 181-187)
 *
 *  - 좌측 2px 청자 보더 + Noto Serif KR · 22px · lineHeight 1.4
 *  - speaker='user' 인 경우 보더 색만 line (단순 dim — em 처리는 Phase 3-5 확장)
 *  - children 이 문자열이면 자동 Text wrapping. ReactNode 이면 그대로 렌더
 */
export interface VoiceBlockProps {
  children: ReactNode
  speaker?: 'companion' | 'user'
}

export function VoiceBlock({ children, speaker = 'companion' }: VoiceBlockProps) {
  const borderColor = speaker === 'companion' ? lightColors.celadon : lightColors.line

  const content =
    typeof children === 'string' || typeof children === 'number' ? (
      <Text
        style={{
          fontFamily: fonts.family.voice,
          fontSize: fonts.size.h1,
          lineHeight: fonts.size.h1 * fonts.lineHeight.voice,
          color: lightColors.text,
        }}
      >
        {children}
      </Text>
    ) : (
      children
    )

  return (
    <View
      style={{
        borderLeftWidth: stroke.voiceBorder,
        borderLeftColor: borderColor,
        paddingLeft: spacing.md - spacing.xs, // 12px
        paddingVertical: spacing.xs,
      }}
    >
      {content}
    </View>
  )
}
