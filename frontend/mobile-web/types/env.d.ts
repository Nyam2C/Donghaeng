/**
 * 동행 — 환경 변수 타입 + process 글로벌 declare
 *
 * Expo가 자동 생성하는 expo-env.d.ts 는 git ignore. 직접 declare는 이 파일에.
 * RN/Expo 는 babel이 build time에 process.env.EXPO_PUBLIC_* substitute.
 * @types/node 풀 install 안 함 (RN 환경엔 어색).
 */

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API?: string
    EXPO_PUBLIC_USE_MOCKS?: string
  }
}

declare const process: {
  env: NodeJS.ProcessEnv
}

/**
 * RN-web 호환 — ViewProps · TextProps 에 className 추가.
 *
 * react-native-web 이 className 을 CSS class 로 처리. native 에선 무시.
 * Onboarding entrance (app/index.tsx) 의 @keyframes class 매핑에 필요.
 */
import 'react-native'
declare module 'react-native' {
  interface ViewProps {
    className?: string
  }
  interface TextProps {
    className?: string
  }
  interface PressableProps {
    className?: string
  }
}
