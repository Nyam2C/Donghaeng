import { Text, View } from 'react-native'

import { lightColors } from '@/theme'

export interface TagChipProps {
  label: string
  active?: boolean
}

export function TagChip({ label, active = false }: TagChipProps) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: active ? lightColors.celadon : lightColors.line,
        backgroundColor: active ? lightColors.celadon : 'transparent',
      }}
    >
      <Text style={{ color: active ? lightColors.bgElev : lightColors.text, fontSize: 13 }}>
        {label}
      </Text>
    </View>
  )
}
