import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { InkMark } from '@/components/ink-mark'
import { useUserStyle } from '@/stores/user-style'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * Phase 3 — 간단 일정 시작 (design-preview SCENARIO 01)
 *
 *  "윤서님은, 처음 만나는 거니까 조금만 여쭤볼게요"
 *  → 결 태그 8개 + 자유 prompt 하이브리드
 *  → "이걸로 시작해요" CTA → 결 저장 → router.push('/plan/recommend')
 *
 * design-preview.html line 1555-1596 markup 을 RN 으로 변환.
 *
 * Phase 3 확장: CTA 가 곧장 SCENARIO 02 (도시 추천) 로 navigation.
 * LLM streaming 응답은 SCENARIO 02 안의 voice 인용 ("윤서님같은 분에게 어울릴 거예요...")
 * 으로 자연스럽게 연결됨. 흐름 단절 (멘트만 보고 멈춤) 방지.
 *
 * promptText 는 현 phase 에선 component state 로만 들고 다음 phase 에 결합 (D5: useUserStyle 시그니처 freeze, utterance 필드 추가 X).
 *
 * DESIGN.md 토큰만:
 *  - 한지 배경 (lightColors.bg) · 청자 액센트 · 먹 본문
 *  - greet-name = Noto Serif KR 20px · greet-meta = Pretendard 11px text-soft
 *  - voice = Noto Serif KR 17px + 좌측 청자 2px 보더 + em italic celadon
 *  - tag = pill (radius 999) — preview 의 ".tag" 그대로
 *  - cta = celadon fill + radius card (14)
 *  - 거품 radius (18+) · UI 이모지 · 보라/그라데이션 금지
 *
 * 사용자 이름 "윤서" 는 design-preview 예시값 그대로 hardcode (v1 데모용 · v2 에 이름 입력).
 */

const VIBE_PRESETS = [
  '혼자가 좋아요',
  '사진 많이',
  '계획 느슨하게',
  '맛집은 꼭',
  '야경/야간',
  '자연 > 도시',
  '체력 좋아요',
  '현지인처럼',
] as const

export default function PlanNew() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const setTags = useUserStyle((s) => s.setTags)

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [promptText, setPromptText] = useState('')

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }, [])

  const canStart = selectedTags.length > 0

  const handleStart = useCallback(() => {
    if (!canStart) return

    // 사용자 결 저장 (D5 user-style persist)
    setTags(selectedTags)

    // SCENARIO 02 (도시 추천) 로 즉시 navigation.
    // 자유 prompt 는 다음 phase 에서 LLM 입력에 결합 — 현재는 흐름 우선.
    // eslint-disable-next-line no-console
    console.log('[plan/new] 결 저장 후 recommend 로 이동:', selectedTags, 'prompt:', promptText)
    router.push('/plan/recommend')
  }, [canStart, selectedTags, promptText, setTags, router])

  const handleSendPrompt = useCallback(() => {
    // prompt input 의 ↑ 버튼: 태그 1개라도 있으면 그냥 start 와 동일.
    // SCENARIO 01 의도("태그 + 자유 prompt 하이브리드") 상 두 input 모두 진행 트리거.
    handleStart()
  }, [handleStart])

  return (
    <View style={{ flex: 1, backgroundColor: lightColors.bgElev }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* greet — InkMark + "윤서님은," */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: spacing.lg,
            marginBottom: spacing.xs,
          }}
        >
          <InkMark size={28} glow="normal" />
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 20,
              fontWeight: '500',
              color: lightColors.text,
            }}
          >
            윤서님은,
          </Text>
        </View>

        {/* greet-meta */}
        <Text
          style={{
            fontFamily: fonts.family.ui,
            fontSize: 11,
            color: lightColors.textSoft,
            marginBottom: spacing.lg,
          }}
        >
          처음 만나는 거니까 조금만 여쭤볼게요
        </Text>

        {/* voice 인용 — 좌측 청자 2px 보더 + Noto Serif KR */}
        {/* design-preview line 1570: "어떤 *결*의 여행이 좋으세요?\n고르거나, 직접 적어주세요." */}
        <View
          style={{
            paddingLeft: spacing.md - 4,
            borderLeftWidth: 2,
            borderLeftColor: lightColors.celadon,
            marginBottom: spacing.lg + 4,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 17,
              lineHeight: 17 * 1.55,
              letterSpacing: -0.17,
              color: lightColors.text,
            }}
          >
            <Text
              style={{
                fontStyle: 'italic',
                color: lightColors.celadon,
              }}
            >
              어떤 결
            </Text>
            의 여행이 좋으세요?
          </Text>
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 17,
              lineHeight: 17 * 1.55,
              letterSpacing: -0.17,
              color: lightColors.text,
            }}
          >
            고르거나, 직접 적어주세요.
          </Text>
        </View>

        {/* 결 태그 grid — 8개 preset, 다중 선택 */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          {VIBE_PRESETS.map((tag) => {
            const active = selectedTags.includes(tag)
            return (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                accessibilityRole="button"
                accessibilityLabel={tag}
                accessibilityState={{ selected: active }}
                hitSlop={6}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md - 2,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: active ? lightColors.celadon : lightColors.line,
                  backgroundColor: active ? lightColors.celadon : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  minHeight: 36,
                }}
              >
                {active ? (
                  <Text
                    style={{
                      fontFamily: fonts.family.mono,
                      fontSize: 12,
                      color: '#FAFAFA',
                      opacity: 0.8,
                    }}
                  >
                    {/* design-preview 의 ✓ 표시 — UI 이모지 금지 규칙은 아이콘류에만 적용,
                       체크 글리프는 data label 로 허용 (DESIGN.md 데이터 라벨 예외). */}
                    {'✓'}
                  </Text>
                ) : null}
                <Text
                  style={{
                    fontFamily: fonts.family.ui,
                    fontSize: 13,
                    color: active ? '#FAFAFA' : lightColors.textMuted,
                    fontWeight: active ? '500' : '400',
                  }}
                >
                  {tag}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* prompt input — 자유 입력 + ↑ send */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: lightColors.bg,
            borderWidth: 1,
            borderColor: lightColors.line,
            borderRadius: radius.cardLarge,
            paddingVertical: spacing.sm + 4,
            paddingHorizontal: spacing.md - 2,
            gap: 10,
          }}
        >
          <TextInput
            value={promptText}
            onChangeText={setPromptText}
            placeholder={'또는 직접 — "조용한 어촌 마을…"'}
            placeholderTextColor={lightColors.textSoft}
            style={{
              flex: 1,
              fontFamily: fonts.family.ui,
              fontSize: 13,
              color: lightColors.text,
              padding: 0,
              minHeight: 20,
            }}
            accessibilityLabel="자유 prompt 입력"
            returnKeyType="send"
            onSubmitEditing={handleSendPrompt}
          />
          <Pressable
            onPress={handleSendPrompt}
            disabled={!canStart && promptText.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel="보내기"
            hitSlop={8}
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              backgroundColor: lightColors.celadon,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.family.ui,
                fontSize: 13,
                color: '#FAFAFA',
                lineHeight: 13,
              }}
            >
              {'↑'}
            </Text>
          </Pressable>
        </View>

        {/* CTA "이걸로 시작해요" — design-preview line 1585 */}
        <Pressable
          onPress={handleStart}
          disabled={!canStart}
          accessibilityRole="button"
          accessibilityLabel="이걸로 시작해요"
          accessibilityState={{ disabled: !canStart }}
          style={{
            marginTop: spacing.md,
            paddingVertical: spacing.md - 2,
            paddingHorizontal: spacing.md,
            borderRadius: radius.cardLarge,
            backgroundColor: canStart ? lightColors.celadon : lightColors.celadonSoft,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 48,
            opacity: canStart ? 1 : 0.7,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: 14,
              fontWeight: '500',
              color: '#FAFAFA',
            }}
          >
            이걸로 시작해요
          </Text>
        </Pressable>

        {/* 돌아가기 — 작은 secondary (디자인-preview 엔 없지만 모바일 nav back 용으로 유지) */}
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back()
            else router.replace('/(tabs)/home')
          }}
          accessibilityRole="button"
          accessibilityLabel="돌아가기"
          style={{
            marginTop: spacing.lg,
            alignSelf: 'center',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.family.ui,
              fontSize: fonts.size.body,
              color: lightColors.textMuted,
            }}
          >
            돌아가기
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}
