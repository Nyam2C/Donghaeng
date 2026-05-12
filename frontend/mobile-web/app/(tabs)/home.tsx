import { Text, View } from 'react-native'

import { lightColors } from '@/theme'

export default function Home() {
  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: lightColors.bg }}>
      <Text style={{ color: lightColors.text }}>오늘은 어떻게 보내고 싶으세요?</Text>
      <Text style={{ color: lightColors.textMuted, marginTop: 8 }}>
        placeholder · Phase 2 (Shell B) 에 채움
      </Text>
    </View>
  )
}
