import { usePathname, useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { stroke } from '@/theme/spacing'

/**
 * TabBar — `(tabs)/_layout.tsx` 의 Tabs.tabBar 와 시각/동작 동일하나
 * stack route (`/plan/*` 등) 에서도 mount 가능한 standalone 컴포넌트 (D41).
 *
 * design-preview line 209-228 의 `.tab-bar` markup 직역 — 4 탭 (홈/여행/대화/나) +
 * 4px tab-dot (currentColor) + Pretendard 10px label + active=celadon · inactive=textSoft.
 *
 * 진입 라우팅: router.push 로 (tabs)/{name} 직진.
 * 현재 경로 매칭: usePathname 결과의 첫 segment 가 탭 이름과 일치하면 active.
 *
 * 사용처:
 *  - `app/plan/new.tsx` (SCENARIO 01 결 입력)
 *  - `app/plan/recommend.tsx` (SCENARIO 02 도시 추천)
 *  - 후속 추가 stack route 들도 동일 패턴.
 */

interface TabDef {
  key: 'home' | 'travel' | 'talk' | 'profile'
  label: string
  href: '/(tabs)/home' | '/(tabs)/travel' | '/(tabs)/talk' | '/(tabs)/profile'
}

const TABS: readonly TabDef[] = [
  { key: 'home', label: '홈', href: '/(tabs)/home' },
  { key: 'travel', label: '여행', href: '/(tabs)/travel' },
  { key: 'talk', label: '대화', href: '/(tabs)/talk' },
  { key: 'profile', label: '나', href: '/(tabs)/profile' },
] as const

function isActive(pathname: string, key: TabDef['key']): boolean {
  // /home · /travel · /talk · /profile (탭 라우트의 평면 path)
  if (pathname === `/${key}`) return true
  if (pathname.startsWith(`/${key}/`)) return true
  return false
}

export function TabBar() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <View
      style={{
        flexDirection: 'row',
        height: 64 + insets.bottom,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 14 + insets.bottom,
        backgroundColor: lightColors.bgElev,
        borderTopColor: lightColors.line,
        borderTopWidth: stroke.line,
      }}
    >
      {TABS.map((t) => {
        const active = isActive(pathname, t.key)
        const color = active ? lightColors.celadon : lightColors.textSoft
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: active }}
            onPress={() => router.push(t.href)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 999,
                backgroundColor: color,
              }}
            />
            <Text
              style={{
                color,
                fontFamily: fonts.family.ui,
                fontSize: 10,
                lineHeight: 14,
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
