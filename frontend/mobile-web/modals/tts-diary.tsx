import { Text, View } from 'react-native'

import type { Turn } from '@trip/types'

import { lightColors } from '@/theme'

export interface TtsDiaryProps {
  turns: Turn[]
}

export function TtsDiary({ turns }: TtsDiaryProps) {
  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: lightColors.bg }}>
      <Text style={{ color: lightColors.text }}>
        placeholder · Phase 5b (tts-diary) 에 채움 · turns: {turns.length}
      </Text>
    </View>
  )
}
