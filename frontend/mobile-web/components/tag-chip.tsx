import { Pressable, Text, View } from 'react-native'

import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * TagChip — 결 태그 칩 (Phase 3 "간단 일정" 의 vibe selector)
 *
 *  - 비활성: 한지 배경 + line 보더 + 먹 본문 색
 *  - 활성:  청자 fill + 청자 보더 (1.5px, ink-mark 잔향) + bgElev(흰) 라벨
 *
 * 시그니처 freeze: { label, active? }. onPress 는 옵셔널 추가 (D12 호환 — 기존 호출처 영향 X).
 * 탭 영역 44pt 이상 보장 (모바일 a11y) — minHeight 44 + 충분한 hitSlop.
 *
 * 폰트는 Pretendard(UI). DESIGN.md 토큰만.
 */

export interface TagChipProps {
  label: string
  active?: boolean
  onPress?: () => void
}

export function TagChip({ label, active = false, onPress }: TagChipProps) {
  const body = (
    <View
      style={{
        minHeight: 44,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.small,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? lightColors.celadon : lightColors.line,
        backgroundColor: active ? lightColors.celadon : lightColors.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: fonts.family.ui,
          fontSize: fonts.size.body,
          fontWeight: active ? '500' : '400',
          color: active ? lightColors.bgElev : lightColors.text,
        }}
      >
        {label}
      </Text>
    </View>
  )

  if (!onPress) return body

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={6}
    >
      {body}
    </Pressable>
  )
}
