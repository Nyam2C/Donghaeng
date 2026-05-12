import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { stroke } from '@/theme/spacing'

/**
 * Phase 2 · Shell — 탭바 (D14)
 *  - 3 탭: 홈 · 여행 · 나
 *  - 대화 탭 v2 보류, `app/talk.tsx` 는 (tabs)/ 밖 stack route → 진입 시 탭바 자동 hide
 *  - 아이콘: 인라인 SVG line-art (1.6px stroke · currentColor · 24×24 viewBox · 이모지 X)
 */

type TabIconProps = { color: string; focused: boolean }

const ICON_SIZE = 24

// 홈 — 두 점 미니 (logo.svg 모티프): 큰 동그라미 + 작은 동그라미
function HomeIcon({ color }: TabIconProps) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Circle cx={9.5} cy={12.5} r={5} stroke={color} strokeWidth={stroke.icon} />
      <Circle cx={17} cy={11} r={2.4} stroke={color} strokeWidth={stroke.icon} />
    </Svg>
  )
}

// 여행 — 두 발자국 (길)
function TravelIcon({ color }: TabIconProps) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 5.5c0 2 1.2 3.6 2.6 3.6S12.2 7.5 12.2 5.5 11 1.9 9.6 1.9 7 3.5 7 5.5Z"
        stroke={color}
        strokeWidth={stroke.icon}
        strokeLinejoin="round"
      />
      <Path
        d="M5 13.6c0 1.1.8 2 1.8 2s1.8-.9 1.8-2"
        stroke={color}
        strokeWidth={stroke.icon}
        strokeLinecap="round"
      />
      <Path
        d="M12 18.5c0 2 1.2 3.6 2.6 3.6s2.6-1.6 2.6-3.6-1.2-3.6-2.6-3.6-2.6 1.6-2.6 3.6Z"
        stroke={color}
        strokeWidth={stroke.icon}
        strokeLinejoin="round"
      />
      <Path
        d="M10 10.6c0 1.1.8 2 1.8 2s1.8-.9 1.8-2"
        stroke={color}
        strokeWidth={stroke.icon}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// 나 — 사람 실루엣 (머리 + 어깨 호)
function ProfileIcon({ color }: TabIconProps) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.4} stroke={color} strokeWidth={stroke.icon} />
      <Path
        d="M5 20c1.4-3.6 4.2-5.4 7-5.4s5.6 1.8 7 5.4"
        stroke={color}
        strokeWidth={stroke.icon}
        strokeLinecap="round"
      />
    </Svg>
  )
}

type TabLabelProps = { color: string; focused: boolean; children: string }

// 폰트 토큰 적용 라벨 (Pretendard · 11-12px caption)
function TabLabel({ color, children }: TabLabelProps) {
  return (
    <Text
      style={{
        color,
        fontFamily: fonts.family.ui,
        fontSize: fonts.size.caption,
        lineHeight: fonts.size.caption * fonts.lineHeight.caption,
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
        tabBarInactiveTintColor: lightColors.textMuted,
        tabBarStyle: {
          backgroundColor: lightColors.bgElev,
          borderTopColor: lightColors.line,
          borderTopWidth: stroke.line,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarIcon: (p) => <HomeIcon color={p.color} focused={p.focused} />,
          tabBarLabel: (p) => (
            <TabLabel color={p.color} focused={p.focused}>
              홈
            </TabLabel>
          ),
        }}
      />
      <Tabs.Screen
        name="travel"
        options={{
          title: '여행',
          tabBarIcon: (p) => <TravelIcon color={p.color} focused={p.focused} />,
          tabBarLabel: (p) => (
            <TabLabel color={p.color} focused={p.focused}>
              여행
            </TabLabel>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '나',
          tabBarIcon: (p) => <ProfileIcon color={p.color} focused={p.focused} />,
          tabBarLabel: (p) => (
            <TabLabel color={p.color} focused={p.focused}>
              나
            </TabLabel>
          ),
        }}
      />
    </Tabs>
  )
}
