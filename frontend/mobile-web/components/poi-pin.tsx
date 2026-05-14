import { Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'

/**
 * Phase 4d (D31) — POI 핀 컴포넌트 (design-preview line 1981-1989 직역).
 *
 * 24x24 (또는 size) 원 + 단청 색 (juhong/moss/celadon) + 흰 보더 2px + 그림자 +
 * 카테고리 아이콘 (12x12 흰색) + DM Mono 9px 거리 라벨 "{N}분".
 *
 * 카테고리 매핑 (KakaoCategory 코드 → 단청):
 *  - CE7 (카페)       → juhong (#C24A36) + coffee path
 *  - FD6 (맛집)       → juhong + bowl/coffee path
 *  - AT4 (관광)       → moss   (#5F8B6E) + mountain path
 *  - CT1 (문화)       → moss   + book path
 *  - AD5 (자연)       → moss   + wave path
 *  - default          → celadon
 *
 * 아이콘은 24×24 viewBox SVG path inline (icons/ 폴더는 stub path "" — 이번 phase 에 채우지 않음.
 * D12 scaffold-freeze 정신: icons/ 컴포넌트 변경 X, 핀 안 SVG 는 자체 path inline).
 */

type PinCategory = 'CE7' | 'FD6' | 'AT4' | 'CT1' | 'AD5' | string

interface PoiPinProps {
  category: PinCategory
  distanceMin?: number
  size?: number
}

interface PinSpec {
  color: string
  path: string
}

// 단청 색 매핑 — design-preview line 1982/1987 의 var(--juhong)/var(--moss) 직접 매핑
function specFor(category: PinCategory): PinSpec {
  switch (category) {
    case 'CE7':
    case 'FD6':
      return { color: lightColors.juhong, path: ICON_PATHS.coffee }
    case 'AT4':
      return { color: lightColors.moss, path: ICON_PATHS.mountain }
    case 'CT1':
      return { color: lightColors.moss, path: ICON_PATHS.book }
    case 'AD5':
      return { color: lightColors.moss, path: ICON_PATHS.wave }
    default:
      return { color: lightColors.celadon, path: ICON_PATHS.dot }
  }
}

// 12x12 시각 식별용 단순 path (viewBox 24x24, stroke 흰)
const ICON_PATHS = {
  // 컵 윤곽 (간략)
  coffee: 'M7 9h8v6a4 4 0 0 1-4 4 4 4 0 0 1-4-4V9zm8 1h2a2 2 0 0 1 0 4h-2',
  // 산 (삼각 2개)
  mountain: 'M4 18l5-8 4 6 3-4 4 6H4z',
  // 책 (펼침)
  book: 'M5 6h6v12H5zm14 0h-6v12h6z',
  // 파도 (sine)
  wave: 'M4 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  // default 점 (작은 원)
  dot: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
} as const

export function PoiPin({ category, distanceMin, size = 24 }: PoiPinProps) {
  const spec = specFor(category)
  const iconSize = Math.round(size / 2)

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: spec.color,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          // design-preview "box-shadow:0 2px 6px rgba(0,0,0,0.15)"
          shadowColor: lightColors.text,
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          elevation: 2,
        }}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <Path
            d={spec.path}
            stroke="#FFFFFF"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>
      {typeof distanceMin === 'number' ? (
        <View
          style={{
            marginTop: 2,
            paddingVertical: 2,
            paddingHorizontal: 4,
            borderRadius: 4,
            // 한지 alpha — design-preview line 1983 "rgba(245,239,227,0.9)" 직역
            backgroundColor: 'rgba(245,239,227,0.9)',
          }}
        >
          <Text
            style={{
              fontFamily: fonts.family.mono,
              fontSize: 9,
              color: lightColors.text,
              lineHeight: 11,
            }}
          >
            {distanceMin}분
          </Text>
        </View>
      ) : null}
    </View>
  )
}
