import { Tabs } from 'expo-router'

import { lightColors } from '@/theme'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: lightColors.celadon,
        tabBarInactiveTintColor: lightColors.textSoft,
        tabBarStyle: {
          backgroundColor: lightColors.bg,
          borderTopColor: lightColors.lineSoft,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="travel" options={{ title: '여행' }} />
      <Tabs.Screen name="profile" options={{ title: '나' }} />
    </Tabs>
  )
}
