import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'

import { useAppFonts } from '@/hooks/use-app-fonts'

export default function RootLayout() {
  const [fontsLoaded] = useAppFonts()
  if (!fontsLoaded) return null

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
