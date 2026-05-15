import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import 'react-native-reanimated'

import { useAppFonts } from '@/hooks/use-app-fonts'

// 폰트 로딩 끝날 때까지 splash 유지 (D15: 권한 prompt 코드 박지 않음)
SplashScreen.preventAutoHideAsync().catch(() => {
  // splash 이미 hidden 일 수 있음 — 무시
})

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts()
  // web 은 public/index.html 의 google fonts CDN 이 처리 → useFonts 우회
  // (native useFonts 가 web 에서 fontsLoaded false stuck 가능성 — 첫 진입 빈 화면 회피)
  const isReady = Platform.OS === 'web' ? true : fontsLoaded || fontError !== null

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {
        // 이미 hidden — 무시
      })
    }
  }, [isReady])

  if (!isReady) return null

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          // D41 — stack 화면 배경 통일 (#FFFFFF). plan/* 같은 (tabs) 밖 화면에서
          // root html 누런 톤이 비치는 issue 회피.
          contentStyle: { backgroundColor: '#FFFFFF' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="plan/new" options={{ headerShown: false }} />
        <Stack.Screen name="plan/recommend" options={{ headerShown: false }} />
        <Stack.Screen name="companion" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  )
}
