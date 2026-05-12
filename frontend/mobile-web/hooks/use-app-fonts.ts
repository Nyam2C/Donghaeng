import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono'
import { Fraunces_400Regular_Italic, Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces'
import {
  NotoSerifKR_400Regular,
  NotoSerifKR_500Medium,
  NotoSerifKR_600SemiBold,
} from '@expo-google-fonts/noto-serif-kr'
/**
 * useAppFonts — 동행 앱 폰트 로더 (D9-a)
 *
 * 호출 위치: app/_layout.tsx (root)
 *
 * Day 2a 시점:
 *  - NotoSerifKR · Fraunces italic · DMMono → @expo-google-fonts/* 패키지 자동 로딩
 *  - Pretendard → 수동 추가 안내 (assets/fonts/README.md). 없으면 OS sans fallback
 *
 * Day 3 Scaffold 부터 ink-mark, voice-block 등 컴포넌트가 이 폰트 family 사용
 */
import { useFonts as useGoogleFonts } from 'expo-font'

// Pretendard 수동 추가 시 주석 해제 (assets/fonts/README.md 참고)
// const pretendardSources = {
//   'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
//   'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.otf'),
//   'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
// }

export function useAppFonts(): [boolean, Error | null] {
  return useGoogleFonts({
    // theme/fonts.family 토큰 키와 정합되도록 alias 등록 (D15 review · P1 fix)
    // RN fontFamily prop 은 expo-font 등록 키와 정확히 일치해야 적용됨
    NotoSerifKR: NotoSerifKR_400Regular,
    'NotoSerifKR-Medium': NotoSerifKR_500Medium,
    'NotoSerifKR-SemiBold': NotoSerifKR_600SemiBold,
    'Fraunces-Italic': Fraunces_400Regular_Italic,
    'Fraunces-Italic-Medium': Fraunces_500Medium_Italic,
    DMMono: DMMono_400Regular,
    'DMMono-Medium': DMMono_500Medium,
    // ...pretendardSources,
  })
}
