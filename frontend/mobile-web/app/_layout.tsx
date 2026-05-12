import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'

import { useAppFonts } from '@/hooks/use-app-fonts'

// Day 3 Scaffold Day에 본격적인 (tabs)/, plan/, companion, talk stack 추가
// Day 2a 시점: 폰트 로딩 + splash 게이팅만
export default function RootLayout() {
  const [fontsLoaded] = useAppFonts()
  if (!fontsLoaded) return null

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  )
}
