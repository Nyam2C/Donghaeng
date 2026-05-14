import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import type { LLMChatResponse, Turn } from '@trip/types'

import { MicIcon } from '@/components/icons/mic'
import { InkMark } from '@/components/ink-mark'
import { streamChat } from '@/services/companion/llm-orchestrator'
import { useSession } from '@/stores/session'
import { useTrip } from '@/stores/trip'
import { useUserStyle } from '@/stores/user-style'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius } from '@/theme/spacing'

/**
 * Talk — SCENARIO 07-CHAT 채팅 default (D32, Phase 5a)
 *
 * design-preview line 2399-2459 직역.
 *
 * 구조:
 *  - 헤더: 잉크 마크 + "오늘의 대화" Noto Serif 15 / "{city} · Day N · {condition} {tempC}°" DM Mono 11
 *          + 우상단 mic 44x44 원 (visual disabled · opacity 0.5 · v2 음성 진입점)
 *  - 대화 ScrollView: 사용자 = Pretendard 14 textMuted · 좌 1px lineStrong 보더
 *                     동행  = Noto Serif 15 text · 좌 2px celadon 보더 (편지 일정 결)
 *                     라벨  = "{HH:MM} · 윤서" / "{HH:MM} · 동행" DM Mono 11 (사용자 textSoft · 동행 celadon)
 *  - 입력창: "계속 적기…" placeholder · pill radius · 전송 ↑ celadon 원 44x44
 *
 * 데이터 흐름:
 *  mount → turns.length === 0 이면 streamChat 첫 인사 자동 호출 → appendTurn(companion)
 *  send → appendTurn(user) → streamChat(history+user) → appendTurn(companion)
 *         실패 시 친구 톤 fallback ("음, 잠깐만요. 다시 한번 말해줄래요?")
 *  new turn → ScrollView 자동 scroll-to-bottom
 *
 * 음성 모드 (SCENARIO 07-VOICE) 는 v2 후순위 — mic 아이콘은 visual placeholder.
 */

const HEADER_TITLE = '오늘의 대화'
const PLACEHOLDER_META = '강릉 · Day 2 · 흐림 17°' // design-preview line 2412 fallback (active trip 없을 때)
const EMPTY_VOICE = '동행이 곧 인사할게요.'
const SEND_FAIL_FALLBACK = '음, 잠깐만요. 다시 한번 말해줄래요?'
const INPUT_PLACEHOLDER = '계속 적기…'

// design-preview --line-strong (rgba(31,31,31,0.15)) — theme 토큰 부재라 inline 정의
// (poi-curation.tsx 의 gradient inline 패턴과 동일 — DESIGN.md 출처 hex 허용 룰)
const LINE_STRONG = 'rgba(31, 31, 31, 0.15)'

/** ts(ms) → "HH:MM" (24h, 0-pad). DM Mono 데이터 라벨 용. */
function formatHHMM(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** active trip 의 day index (1-based, startDate 기준). 없으면 1. */
function computeDayIndex(startDate: string | undefined): number {
  if (!startDate) return 1
  const start = new Date(startDate).getTime()
  if (Number.isNaN(start)) return 1
  const today = Date.now()
  const diffDays = Math.floor((today - start) / (24 * 60 * 60 * 1000))
  return Math.max(1, diffDays + 1)
}

/** 헤더 meta 한 줄: "{city} · Day N · {condition} {tempC}°" (active trip 없을 때 fallback). */
function buildHeaderMeta(city: string | undefined, dayIndex: number): string {
  if (!city) return PLACEHOLDER_META
  // 날씨는 Phase 4e/4f 의 forecast 와 동기화 가능하나 v1 채팅은 city · Day N 만 표시.
  // 추후 weather poll 결과를 useSession 또는 별도 store 에서 read 해 보강 (확장 hook 자리).
  return `${city} · Day ${dayIndex}`
}

export default function Talk() {
  const insets = useSafeAreaInsets()

  // 대화 history + 추가 액션 (D5 session store)
  const turns = useSession((s) => s.turns)
  const appendTurn = useSession((s) => s.appendTurn)

  // active 여행 (city / dates / planning_step) — selector shallow 로 묶음
  const activeTrip = useTrip(
    useShallow((s) =>
      s.active
        ? {
            city: s.active.city,
            startDate: s.active.startDate,
            endDate: s.active.endDate,
            planningStep: s.active.planning_step,
          }
        : null,
    ),
  )

  // user style — chat input 의 userStyle 인자 (LLM 친구 톤 결 인지)
  const userStyle = useUserStyle(
    useShallow((s) => ({
      tags: s.tags,
      likedPoiIds: s.likedPoiIds,
      dislikedPoiIds: s.dislikedPoiIds,
    })),
  )

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const introFiredRef = useRef(false)

  // 자동 scroll-to-bottom: turns 늘어날 때마다 끝으로 (60ms 지연으로 layout 후)
  // biome-ignore lint/correctness/useExhaustiveDependencies: turns.length 변화 감지가 의도. body 안에서 turns 직접 참조 X
  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    }, 60)
    return () => clearTimeout(id)
  }, [turns.length])

  /** chat 호출 공통 — history + userMessage 입력, final 응답을 companion turn 으로 append. */
  const callChat = useCallback(
    async (userMessage: string, historySnapshot: Turn[]) => {
      let final: LLMChatResponse | undefined
      try {
        for await (const ev of streamChat({
          userStyle: {
            tags: userStyle.tags,
            likedPoiIds: userStyle.likedPoiIds,
            dislikedPoiIds: userStyle.dislikedPoiIds,
          },
          history: historySnapshot,
          userMessage,
          tripContext: activeTrip
            ? {
                city: activeTrip.city,
                startDate: activeTrip.startDate,
                endDate: activeTrip.endDate,
                planningStep: activeTrip.planningStep,
              }
            : undefined,
        })) {
          if (ev.final) {
            final = ev.final
            break
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[talk] streamChat 실패:', err)
      }

      const responseText = final?.response ?? SEND_FAIL_FALLBACK
      appendTurn({ ts: Date.now(), speaker: 'companion', text: responseText })
    },
    [activeTrip, appendTurn, userStyle.tags, userStyle.likedPoiIds, userStyle.dislikedPoiIds],
  )

  // 첫 진입 자동 인사 — turns 비어있고 한 번도 안 쐈으면 streamChat 의 첫 응답을 갈음
  // (mock fixture 의 첫 인사가 design-preview line 2422 직역).
  // intro 는 mount 시 단 한 번만. turns/activeTrip 변경에 재실행 X — introFiredRef 로 보호.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intro 는 mount 시 1회만, 최신 store 값은 inline read
  useEffect(() => {
    if (introFiredRef.current) return
    if (turns.length > 0) {
      introFiredRef.current = true
      return
    }
    introFiredRef.current = true
    // userMessage='__intro__' 으로 인사 트리거. Lane B 의 chat-conversation 은
    // 첫 호출 (history=[] · userMessage='__intro__') 시 친구 톤 인사로 응답.
    // mock 은 fixture 인사 그대로 반환.
    void (async () => {
      // 최신 store 값을 effect body 안에서 직접 read — closure stale 회피.
      const us = useUserStyle.getState()
      const trip = useTrip.getState().active
      try {
        let final: LLMChatResponse | undefined
        for await (const ev of streamChat({
          userStyle: {
            tags: us.tags,
            likedPoiIds: us.likedPoiIds,
            dislikedPoiIds: us.dislikedPoiIds,
          },
          history: [],
          userMessage: '__intro__',
          tripContext: trip
            ? {
                city: trip.city,
                startDate: trip.startDate,
                endDate: trip.endDate,
                planningStep: trip.planning_step,
              }
            : undefined,
        })) {
          if (ev.final) {
            final = ev.final
            break
          }
        }
        if (final) {
          appendTurn({ ts: Date.now(), speaker: 'companion', text: final.response })
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[talk] intro streamChat 실패:', err)
      }
    })()
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (trimmed.length === 0 || sending) return
    const userTurn: Turn = { ts: Date.now(), speaker: 'user', text: trimmed }
    appendTurn(userTurn)
    setInput('')
    setSending(true)
    // history snapshot = userTurn 까지 포함 (Lane B 가 history 의 마지막을 userMessage 와 일치하는지 dedupe)
    // 하지만 D32 contract 는 history 가 userMessage 직전까지 — 그래서 turns 만 (userTurn 제외) 전달
    void callChat(trimmed, turns).finally(() => setSending(false))
  }, [appendTurn, callChat, input, sending, turns])

  const meta = useMemo(
    () => buildHeaderMeta(activeTrip?.city, computeDayIndex(activeTrip?.startDate)),
    [activeTrip?.city, activeTrip?.startDate],
  )

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: lightColors.bgElev }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: lightColors.bgElev,
          paddingTop: insets.top + 14,
        }}
      >
        {/* 헤더 — design-preview line 2407-2416 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 22,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <InkMark size={24} glow="normal" />
            <View>
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 15,
                  fontWeight: '500',
                  color: lightColors.text,
                }}
              >
                {HEADER_TITLE}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.family.mono,
                  fontSize: 11,
                  color: lightColors.textSoft,
                  marginTop: 2,
                }}
              >
                {meta}
              </Text>
            </View>
          </View>

          {/* 우상단 mic — visual disabled (v2 음성 진입점) — design-preview line 2415 직역 */}
          <View
            accessibilityRole="image"
            accessibilityLabel="음성 모드 — v2 후순위"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: lightColors.bg,
              borderWidth: 1,
              borderColor: lightColors.line,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.5,
            }}
          >
            <MicIcon size={20} color={lightColors.textSoft} />
          </View>
        </View>

        {/* 대화 ScrollView — design-preview line 2418-2444 */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingBottom: 12,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {turns.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 64,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 14,
                  color: lightColors.textSoft,
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                {EMPTY_VOICE}
              </Text>
            </View>
          ) : (
            turns.map((turn, idx) => {
              const isUser = turn.speaker === 'user'
              const labelColor = isUser ? lightColors.textSoft : lightColors.celadon
              const labelName = isUser ? '윤서' : '동행'
              return (
                <View key={`${turn.ts}-${idx}`} style={{ marginBottom: 18 }}>
                  {/* 시간 + 화자 라벨 — DM Mono 11 */}
                  <Text
                    style={{
                      fontFamily: fonts.family.mono,
                      fontSize: 11,
                      color: labelColor,
                      marginBottom: 4,
                    }}
                  >
                    {formatHHMM(turn.ts)} · {labelName}
                  </Text>
                  {/* 본문 — 사용자 = Pretendard dim · 동행 = Noto Serif + 좌 청자 보더 */}
                  {isUser ? (
                    <Text
                      style={{
                        fontFamily: fonts.family.ui,
                        fontSize: 14,
                        color: lightColors.textMuted,
                        lineHeight: 22, // 14 * 1.55
                        paddingLeft: 10,
                        borderLeftWidth: 1,
                        borderLeftColor: LINE_STRONG,
                      }}
                    >
                      {turn.text}
                    </Text>
                  ) : (
                    <Text
                      style={{
                        fontFamily: fonts.family.voice,
                        fontSize: 15,
                        color: lightColors.text,
                        lineHeight: 26, // 15 * 1.7
                        paddingLeft: 10,
                        borderLeftWidth: 2,
                        borderLeftColor: lightColors.celadon,
                      }}
                    >
                      {turn.text}
                    </Text>
                  )}
                </View>
              )
            })
          )}
          {sending ? (
            <View style={{ marginBottom: 8 }}>
              <Text
                style={{
                  fontFamily: fonts.family.mono,
                  fontSize: 11,
                  color: lightColors.celadon,
                  marginBottom: 4,
                }}
              >
                {formatHHMM(Date.now())} · 동행
              </Text>
              <Text
                style={{
                  fontFamily: fonts.family.voice,
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: lightColors.textMuted,
                  lineHeight: 22,
                  paddingLeft: 10,
                  borderLeftWidth: 2,
                  borderLeftColor: lightColors.celadon,
                }}
              >
                잠시만요…
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* 입력창 + 전송 — design-preview line 2446-2449 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 22,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12),
            borderTopWidth: 1,
            borderTopColor: lightColors.line,
            backgroundColor: lightColors.bgElev,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            placeholder={INPUT_PLACEHOLDER}
            placeholderTextColor={lightColors.textSoft}
            editable={!sending}
            returnKeyType="send"
            blurOnSubmit={false}
            style={{
              flex: 1,
              backgroundColor: lightColors.bg,
              borderWidth: 1,
              borderColor: lightColors.line,
              borderRadius: radius.pill,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontFamily: fonts.family.ui,
              fontSize: 13,
              color: lightColors.text,
            }}
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || input.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel="전송"
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: lightColors.celadon,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: sending || input.trim().length === 0 ? 0.5 : pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fonts.family.voice,
                fontSize: 18,
                color: lightColors.bgElev,
                lineHeight: 20,
              }}
            >
              ↑
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
