import { Text, View } from 'react-native'

import { lightColors } from '@/theme'

export default function Profile() {
  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: lightColors.bg }}>
      <Text style={{ color: lightColors.text }}>placeholder · v2 에 채움</Text>
    </View>
  )
}
