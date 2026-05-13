import { Text, View } from 'react-native'

import { lightColors } from '@/theme'

/**
 * Talk — TTS 대화 placeholder (Phase 5 에 채움)
 *
 * D17 갱신: 탭바 4 탭 통일을 위해 (tabs)/ 안으로 이동.
 * 탭바 hide 는 (tabs)/_layout.tsx 의 screenOptions 로 처리 (DESIGN.md 라인 271).
 */
export default function Talk() {
  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: lightColors.bg }}>
      <Text style={{ color: lightColors.text }}>placeholder · Phase 5 (TTS 대화) 에 채움</Text>
    </View>
  )
}
