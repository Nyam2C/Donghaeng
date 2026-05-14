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
 *  - 모든 탭에서 탭바 visible (D32 — 대화 탭 default = 채팅, design-preview SCENARIO 07-CHAT line 2451-2455 의
 *    `tab-bar` 그대로). 기존 D17 의 "TTS 에서만 탭바 숨김" 룰은 음성 모드 v2 후순위로 함께 미룸.
 *
 * D14 (3 탭) → D17 (4 탭) → D32 (talk 탭바 visible) 갱신.
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
          // D32 — 채팅 default 이므로 탭바 visible (음성 모드 v2 에서만 hide 부활 예정)
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
