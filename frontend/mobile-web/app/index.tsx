import { lightColors } from '@/theme'
import { Text, View } from 'react-native'

// Phase 1 Day 2a placeholder
// Day 3 Scaffold Day에 (tabs)/home.tsx 로 이동
export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: lightColors.bg,
        padding: 24,
      }}
    >
      <Text
        style={{
          color: lightColors.celadon,
          fontSize: 28,
          fontFamily: 'NotoSerifKR_500Medium',
          marginBottom: 12,
        }}
      >
        동행
      </Text>
      <Text
        style={{
          color: lightColors.textMuted,
          fontSize: 14,
          textAlign: 'center',
        }}
      >
        Phase 1 Day 2a — 셋업 완료{'\n'}
        Day 3 Scaffold Day 후 본격 화면
      </Text>
    </View>
  )
}
