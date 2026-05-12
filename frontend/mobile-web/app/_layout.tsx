import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import 'react-native-reanimated'

import { useAppFonts } from '@/hooks/use-app-fonts'

// 폰트 로딩 끝날 때까지 splash 유지 (D15: 권한 prompt 코드 박지 않음)
SplashScreen.preventAutoHideAsync().catch(() => {
  // splash 이미 hidden 일 수 있음 — 무시
})

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts()

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        // 이미 hidden — 무시
      })
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="plan/new" options={{ title: '간단 일정 시작' }} />
        <Stack.Screen name="companion" options={{ headerShown: false }} />
        <Stack.Screen name="talk" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  )
}
