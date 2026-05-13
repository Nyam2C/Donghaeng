import { Tabs } from 'expo-router'
import { Text, View } from 'react-native'

import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { stroke } from '@/theme/spacing'

/**
 * Shell — 탭바 (D17 갱신 · design-preview SHELL B 그대로)
 *  - 4 탭: 홈 · 여행 · 대화 · 나
 *  - 아이콘 = 4px tab-dot (currentColor) — preview line 216 의 .tab-dot
 *  - 라벨 10px Pretendard, gap 4px, height 64
 *  - active=celadon, inactive=textSoft
 *  - talk 진입 시 탭바 hide (DESIGN.md 라인 271 "TTS 에서만 탭바를 숨긴다")
 *
 * D14 (3 탭) → D17 (4 탭) 갱신 사유: 사용자 요청 — design-preview 그대로 통일
 */

type TabDotProps = { color: string }

function TabDot({ color }: TabDotProps) {
  return (
    <View
      style={{
        width: 4,
        height: 4,
        borderRadius: 999,
        backgroundColor: color,
      }}
    />
  )
}

type TabLabelProps = { color: string; children: string }

function TabLabel({ color, children }: TabLabelProps) {
  return (
    <Text
      style={{
        color,
        fontFamily: fonts.family.ui,
        fontSize: 10,
        lineHeight: 14,
      }}
    >
      {children}
    </Text>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: lightColors.celadon,
        tabBarInactiveTintColor: lightColors.textSoft,
        tabBarStyle: {
          height: 64,
          paddingHorizontal: 16,
          paddingBottom: 14,
          backgroundColor: lightColors.bgElev,
          borderTopColor: lightColors.line,
          borderTopWidth: stroke.line,
        },
        tabBarItemStyle: {
          gap: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarIcon: (p) => <TabDot color={p.color} />,
          tabBarLabel: (p) => <TabLabel color={p.color}>홈</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="travel"
        options={{
          title: '여행',
          tabBarIcon: (p) => <TabDot color={p.color} />,
          tabBarLabel: (p) => <TabLabel color={p.color}>여행</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="talk"
        options={{
          title: '대화',
          tabBarIcon: (p) => <TabDot color={p.color} />,
          tabBarLabel: (p) => <TabLabel color={p.color}>대화</TabLabel>,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '나',
          tabBarIcon: (p) => <TabDot color={p.color} />,
          tabBarLabel: (p) => <TabLabel color={p.color}>나</TabLabel>,
        }}
      />
    </Tabs>
  )
}
