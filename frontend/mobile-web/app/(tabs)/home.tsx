import { LinearGradient } from 'expo-linear-gradient'
import { Link } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { InkMark } from '@/components/ink-mark'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * Home — Shell B (docs/design-preview.html 의 SHELL B 그대로 RN 변환)
 *
 *  - greet (잉크 마크 + 이름) + home-meta (날짜/날씨) + home-heading (em italic celadon)
 *  - next-trip (celadon-tint 카드 + 그라데이션 썸네일 + Fraunces italic count)
 *  - quick-grid (2x2 카드 · 잉크 점 + 라벨 + desc)
 *  - ambient (잉크 마크 + 명조 메시지 + em italic celadon)
 *
 * dummy 값 (사용자 이름/날씨/다음 여행/ambient) 은 Phase 3-5 에 store
 * (user-style · weather · trip · alert-queue) 연결 시 실제 데이터로 교체.
 */

// DESIGN.md 92줄 토큰 — theme/colors.ts 가 freeze 라 inline
const celadonTint = 'rgba(74, 111, 165, 0.08)'

type Dot = { size: 'sm' | 'md' | 'lg'; color?: string; opacity?: number }

type QuickActionProps = {
  href: string
  label: string
  description: string
  dots: Dot[]
}

function dotPx(s: Dot['size']) {
  return s === 'lg' ? 14 : s === 'sm' ? 6 : 10
}

function dotOpacity(d: Dot) {
  if (d.opacity !== undefined) return d.opacity
  if (d.size === 'sm') return 0.55
  if (d.size === 'lg') return 1
  return 0.85
}

function QuickAction({ href, label, description, dots }: QuickActionProps) {
  return (
    <Link href={href as never} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={description}
        style={{
          flex: 1,
          minHeight: 84,
          padding: 14,
          backgroundColor: lightColors.bg,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: lightColors.line,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {dots.map((d, i) => (
            <View
              key={`${d.size}-${d.color ?? 'c'}-${i}`}
              style={{
                width: dotPx(d.size),
                height: dotPx(d.size),
                borderRadius: 999,
                backgroundColor: d.color ?? lightColors.celadon,
                opacity: dotOpacity(d),
              }}
            />
          ))}
        </View>
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 14,
            fontWeight: '500',
            color: lightColors.text,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: lightColors.textSoft,
            lineHeight: 10 * 1.5,
            fontFamily: fonts.family.ui,
          }}
        >
          {description}
        </Text>
      </Pressable>
    </Link>
  )
}

export default function Home() {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: lightColors.bgElev }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* greet — 잉크 마크 + 이름 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginTop: 14,
        }}
      >
        <InkMark size={24} glow="normal" />
        <Text
          style={{
            fontSize: 14,
            color: lightColors.textMuted,
            fontFamily: fonts.family.ui,
          }}
        >
          윤서님
        </Text>
      </View>

      {/* home-meta — 날짜 · 날씨 (DM Mono · 11px · text-soft) */}
      <Text
        style={{
          fontSize: 11,
          color: lightColors.textSoft,
          marginTop: spacing.xs,
          marginBottom: spacing.sm,
          fontFamily: fonts.family.mono,
        }}
      >
        화요일 · 5월 12일 · 흐림 18°
      </Text>

      {/* home-heading — "오늘은 *어떻게* 보내고 싶으세요?" */}
      <Text
        style={{
          fontFamily: fonts.family.voice,
          fontSize: 24,
          fontWeight: '500',
          lineHeight: 24 * 1.4,
          letterSpacing: -0.48,
          marginTop: spacing.xs,
          marginBottom: spacing.lg,
          color: lightColors.text,
        }}
      >
        오늘은{' '}
        <Text
          style={{
            fontFamily: fonts.family.numeric,
            fontStyle: 'italic',
            color: lightColors.celadon,
          }}
        >
          어떻게
        </Text>
        {'\n'}보내고 싶으세요?
      </Text>

      {/* next-trip — celadon-tint 카드 + gradient 썸네일 + Fraunces italic count */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          backgroundColor: celadonTint,
          borderRadius: radius.cardLarge,
          borderWidth: 1,
          borderColor: lightColors.celadonSoft,
          marginBottom: spacing.md,
        }}
      >
        <LinearGradient
          colors={[lightColors.amber, lightColors.juhong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 48, height: 48, borderRadius: 10 }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 15,
              fontWeight: '500',
              color: lightColors.text,
            }}
          >
            부산 · 2박 3일
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: lightColors.celadon,
              fontFamily: fonts.family.mono,
              marginTop: 2,
            }}
          >
            5/24 출발 · KE 1837
          </Text>
        </View>
        <Text
          style={{
            fontFamily: fonts.family.numeric,
            fontStyle: 'italic',
            fontSize: 24,
            color: lightColors.celadon,
          }}
        >
          12
          <Text
            style={{
              fontSize: 11,
              fontFamily: fonts.family.mono,
              fontStyle: 'normal',
              opacity: 0.7,
            }}
          >
            일 후
          </Text>
        </Text>
      </View>

      {/* quick-grid — 2x2 카드 */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
        <QuickAction
          href="/plan/new"
          label="새로 짜기"
          description="처음부터 동행과 함께"
          dots={[{ size: 'lg' }, { size: 'sm' }]}
        />
        <QuickAction
          href="/profile"
          label="지난 여행"
          description="12번의 동행"
          dots={[{ size: 'md' }, { size: 'md' }, { size: 'sm' }]}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <QuickAction
          href="/profile"
          label="내 패턴"
          description="어디를 좋아하셨는지"
          dots={[
            { size: 'md', color: lightColors.moss },
            { size: 'md', color: lightColors.amber },
          ]}
        />
        <QuickAction
          href="/companion"
          label="지금 떠나기"
          description="당일치기 · 즉시 제안"
          dots={[{ size: 'lg', color: lightColors.juhong }]}
        />
      </View>

      {/* ambient — 잉크 마크 + 명조 메시지 + em italic celadon */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
          padding: 12,
          paddingHorizontal: 14,
          backgroundColor: lightColors.bg,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: lightColors.line,
          marginTop: spacing.sm,
        }}
      >
        <View style={{ marginTop: 2 }}>
          <InkMark size={20} glow="normal" />
        </View>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.family.voice,
            fontSize: 13,
            lineHeight: 13 * 1.55,
            color: lightColors.text,
          }}
        >
          어제 강릉 정리해뒀어요.{' '}
          <Text
            style={{
              color: lightColors.celadon,
              fontStyle: 'italic',
              fontFamily: fonts.family.numeric,
            }}
          >
            한 번 봐주세요.
          </Text>
        </Text>
      </View>
    </ScrollView>
  )
}
