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
    // Voice · 한글 헤딩
    NotoSerifKR_400Regular,
    NotoSerifKR_500Medium,
    NotoSerifKR_600SemiBold,
    // Latin · 숫자 강조 (italic)
    Fraunces_400Regular_Italic,
    Fraunces_500Medium_Italic,
    // Data · time · mono
    DMMono_400Regular,
    DMMono_500Medium,
    // ...pretendardSources,
  })
}
