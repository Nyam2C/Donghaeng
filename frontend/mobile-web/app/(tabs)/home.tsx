import { Link } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { InkMark } from '@/components/ink-mark'
import { VoiceBlock } from '@/components/voice-block'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { spacing } from '@/theme/spacing'

/**
 * Home — Shell B (DESIGN.md 라인 230-249)
 *
 *  - 좌상단 24px 잉크 마크 (호흡 ON)
 *  - 한 문장 voice 질문 (Noto Serif KR · 22px · 좌측 청자 보더)
 *  - 다음 여행: Phase 2 엔 trip store 미연결 → 빈 상태만 렌더 (D14 결정)
 *  - 4 quick action: 잉크 점(8-12px) + 라벨, 자유 좌표 (그리드 X)
 *  - hit area 44×44 최소 (padding 으로 확장)
 *  - ambient 알림 슬롯은 layout 만, 빈 상태 ok
 *
 * 권한 prompt 코드 박지 않음 (D15 — Phase 3-5 services 에서 lazy)
 */

type QuickActionProps = {
  href: string
  label: string
  description: string
  dotSize: number
  align: 'left' | 'center' | 'right'
  offsetTop: number
}

function QuickAction({ href, label, description, dotSize, align, offsetTop }: QuickActionProps) {
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'
  return (
    <Link href={href as never} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={description}
        style={{
          marginTop: offsetTop,
          alignSelf:
            justify === 'flex-start'
              ? 'flex-start'
              : justify === 'flex-end'
                ? 'flex-end'
                : 'center',
          minHeight: 44,
          minWidth: 44,
          paddingVertical: spacing.sm + spacing.xs, // 12
          paddingHorizontal: spacing.md, // 16
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm + spacing.xs, // 12
        }}
      >
        <View
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: lightColors.celadon,
            opacity: 0.88,
            marginTop: 2,
          }}
        />
        <View style={{ flexShrink: 1 }}>
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: fonts.size.body,
              lineHeight: fonts.size.body * fonts.lineHeight.body,
              color: lightColors.text,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: fonts.size.caption,
              lineHeight: fonts.size.caption * fonts.lineHeight.caption,
              color: lightColors.textSoft,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        </View>
      </Pressable>
    </Link>
  )
}

function NextTripBlock(): ReactNode {
  // Phase 2: trip store 연결 X — 빈 상태만 렌더
  return (
    <Text
      style={{
        fontFamily: fonts.family.ui,
        fontSize: fonts.size.body,
        lineHeight: fonts.size.body * fonts.lineHeight.body,
        color: lightColors.textMuted,
      }}
    >
      아직 계획 없어요
    </Text>
  )
}

export default function Home() {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: lightColors.bg,
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
      }}
    >
      {/* 좌상단 잉크 마크 — 24px · 호흡 ON */}
      <View style={{ alignSelf: 'flex-start', marginBottom: spacing['3xl'] }}>
        <InkMark size={24} glow="normal" />
      </View>

      {/* 한 문장 voice 질문 — "어떻게" italic celadon 강조 (DESIGN.md 184줄 패턴) */}
      <View style={{ marginBottom: spacing['3xl'] }}>
        <VoiceBlock>
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: fonts.size.h1,
              lineHeight: fonts.size.h1 * fonts.lineHeight.voice,
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
        </VoiceBlock>
      </View>

      {/* 다음 여행 — Phase 2: 빈 상태만 */}
      <View style={{ marginBottom: spacing['2xl'] }}>
        <Text
          style={{
            fontFamily: fonts.family.ui,
            fontSize: fonts.size.caption,
            lineHeight: fonts.size.caption * fonts.lineHeight.caption,
            color: lightColors.textSoft,
            marginBottom: spacing.sm,
          }}
        >
          다음 여행
        </Text>
        <NextTripBlock />
      </View>

      {/* 4 quick action — 잉크 점 자유 좌표 (그리드 X · 비대칭 배치) + 라벨 + 설명 */}
      <View style={{ flex: 1 }}>
        <QuickAction
          href="/plan/new"
          label="일정 시작"
          description="처음부터 동행과 함께"
          dotSize={12}
          align="left"
          offsetTop={spacing.sm}
        />
        <QuickAction
          href="/companion"
          label="현장 컴패니언"
          description="옆에서 같이 보기"
          dotSize={10}
          align="right"
          offsetTop={spacing.lg}
        />
        <QuickAction
          href="/talk"
          label="대화"
          description="음성·일기로 이야기"
          dotSize={11}
          align="left"
          offsetTop={spacing.xl}
        />
        <QuickAction
          href="/profile"
          label="내 결"
          description="취향과 지난 여행"
          dotSize={8}
          align="center"
          offsetTop={spacing.lg}
        />
      </View>

      {/* ambient 알림 슬롯 — Phase 2: 빈 layout 만 */}
      <View style={{ minHeight: spacing.xl }} />
    </View>
  )
}
