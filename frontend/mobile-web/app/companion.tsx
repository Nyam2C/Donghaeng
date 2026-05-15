import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import type { GpsCoord, KakaoPOI, MomentCard as MomentCardType } from '@trip/types'

import { InkMark } from '@/components/ink-mark'
import { MomentCard } from '@/components/moment-card'
import { CompanionMap } from '@/modals/companion-map'
import { LetterItinerary } from '@/modals/letter-itinerary'
import { apiFetch } from '@/services/api-client'
import { resolveNextCard } from '@/services/companion/card-resolver'
import { streamRecommendation } from '@/services/companion/llm-orchestrator'
import { useCompanionActions } from '@/services/companion/state'
import { getCurrentGps } from '@/services/location'
import { nearbyPois } from '@/services/poi'
import { useSession } from '@/stores/session'
import { useTrip } from '@/stores/trip'
import { useUserStyle } from '@/stores/user-style'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius, spacing } from '@/theme/spacing'

/**
 * Phase 4a — 현장 컴패니언 카드 뷰 A (default)
 *
 * 데이터 흐름 (ENG-PLAN line 181-204):
 *  1. getCurrentGps → 현재 좌표
 *  2. nearbyPois (CE7/FD6/AT4) → 5개 후보
 *  3. streamRecommendation (userStyle + utterance "지금 어디 가볼까") → final
 *  4. final.recommended_ids[0] → POI lookup → MomentCard render
 *  5. 1시간 weather poll → raining || alertWindowMin <= 60 시 ALERT 이벤트
 *  6. POI hours.closedToday → poi-closed ALERT 이벤트
 *  7. alertQueue subscribe → resolveNextCard 로 카드 타입 swap
 *
 * 에러 처리:
 *  - 위치 권한 거부 → AWAY 카드 ("다시 연결되면 알려줄게")
 *  - LLM hallucination throw → AWAY 카드 ("지금은 좀 조용해요, 잠시 후 다시 찾아볼게")
 *  - weather endpoint 404 → 무시 (Lane B 가 채울 때까지)
 *
 * 캐시:
 *  - POI cache 1km/5분: 단순 useRef. 좌표 기준 < 1km && ts < 5분 이면 재사용
 *  - 5분 expire 후 재호출
 */

const POI_CATEGORIES = ['CE7', 'FD6', 'AT4'] as const
const WEATHER_POLL_INTERVAL_MS = 60 * 60 * 1000 // 1시간
const POI_CACHE_TTL_MS = 5 * 60 * 1000 // 5분
const POI_CACHE_RADIUS_M = 1000 // 1km

interface PoiCacheEntry {
  gps: GpsCoord
  pois: KakaoPOI[]
  ts: number
}

interface WeatherResponse {
  raining: boolean
  tempC: number
  alertWindowMin: number
}

/** 두 좌표 사이 거리 (m). 단순화한 평면 근사 — 1km 이내 캐시 hit 판정용으로 충분. */
function gpsDistanceMeters(a: GpsCoord, b: GpsCoord): number {
  const dLat = (a.lat - b.lat) * 111000
  const dLng = (a.lng - b.lng) * 111000 * Math.cos((a.lat * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

type CompanionState =
  | { status: 'loading' }
  | { status: 'ready'; card: MomentCardType }
  | { status: 'away'; reason: 'permission' | 'offline' | 'hallucination' }

const AWAY_COPY: Record<'permission' | 'offline' | 'hallucination', string> = {
  permission: '위치를 알려주면 근처를 같이 봐줄게',
  offline: '다시 연결되면 알려줄게',
  hallucination: '지금은 좀 조용해요, 잠시 후 다시 찾아볼게',
}

const ALERT_COPY: Record<'weather' | 'poi-closed', string> = {
  weather: '비가 와요 — 실내 추천',
  'poi-closed': '여기 닫혔어요 — 대안 있어요',
}

export default function Companion() {
  const insets = useSafeAreaInsets()
  // useShallow: zustand 5 selector 가 매 render 마다 새 객체 반환 → useSyncExternalStore
  // "getSnapshot should be cached" 무한 rerender. shallow equality 로 reference 안정화.
  const userStyle = useUserStyle(
    useShallow((s) => ({
      tags: s.tags,
      likedPoiIds: s.likedPoiIds,
      dislikedPoiIds: s.dislikedPoiIds,
    })),
  )
  const alertQueue = useSession((s) => s.alertQueue)
  const glow = useSession((s) => s.glow)
  const { pushAlert, acknowledgeAlert, setGlow } = useCompanionActions()
  // D38 — 편지 일정 SPECIAL 진입점. activeRoute 있을 때만 [편지로 보기] 렌더.
  const activeTrip = useTrip((s) => s.active)
  const activeRoute = useTrip((s) => s.activeRoute)

  const [state, setState] = useState<CompanionState>({ status: 'loading' })
  const [mapOpen, setMapOpen] = useState(false)
  const [letterOpen, setLetterOpen] = useState(false)
  const poiCacheRef = useRef<PoiCacheEntry | null>(null)

  /**
   * 카드 1개 로드: GPS → POI → LLM → MomentCard.
   * 캐시 hit (1km · 5분) 시 POI 재사용.
   */
  const loadCard = useCallback(async () => {
    setState({ status: 'loading' })
    let gps: GpsCoord
    try {
      gps = await getCurrentGps()
    } catch {
      setState({ status: 'away', reason: 'permission' })
      setGlow('away')
      return
    }

    // POI cache hit?
    let pois: KakaoPOI[]
    const now = Date.now()
    const cache = poiCacheRef.current
    if (
      cache &&
      now - cache.ts < POI_CACHE_TTL_MS &&
      gpsDistanceMeters(cache.gps, gps) < POI_CACHE_RADIUS_M
    ) {
      pois = cache.pois
    } else {
      try {
        pois = await nearbyPois(gps, [...POI_CATEGORIES])
      } catch {
        setState({ status: 'away', reason: 'offline' })
        setGlow('away')
        return
      }
      poiCacheRef.current = { gps, pois, ts: now }
    }

    if (pois.length === 0) {
      setState({ status: 'away', reason: 'offline' })
      setGlow('away')
      return
    }

    // POI hours.closedToday 체크 → ALERT trigger
    const closedPoi = pois.find((p) => p.hours?.closedToday === true)
    if (closedPoi) {
      pushAlert({
        ts: Date.now(),
        type: 'poi-closed',
        detail: `${closedPoi.name} 가 오늘 휴무`,
      })
    }

    // LLM 호출
    try {
      let finalNote = ''
      let chosenId: string | null = null
      for await (const ev of streamRecommendation({
        userStyle,
        utterance: '지금 어디 가볼까',
        candidatePois: pois,
      })) {
        if (ev.final) {
          finalNote = ev.final.note
          chosenId = ev.final.recommended_ids[0] ?? null
          break
        }
      }
      // recommended_ids 가 빈 배열이면 첫 POI 로 fallback (검증은 orchestrator 에서 통과)
      const poi = chosenId ? pois.find((p) => p.id === chosenId) : pois[0]
      const resolvedPoi = poi ?? pois[0]
      if (!resolvedPoi) {
        setState({ status: 'away', reason: 'offline' })
        setGlow('away')
        return
      }
      // 카드 타입은 항상 NORMAL 로 초기 세팅 — alertQueue effect 가 ALERT 로 swap.
      const card: MomentCardType = {
        type: 'NORMAL',
        poi: resolvedPoi,
        note: finalNote || '근처를 한번 둘러볼게',
        variant: 'large',
      }
      setState({ status: 'ready', card })
      setGlow('normal')
    } catch {
      setState({ status: 'away', reason: 'hallucination' })
      setGlow('away')
    }
  }, [userStyle, pushAlert, setGlow])

  // mount 시 1회 로드 + loadCard 변동 시 재호출 (userStyle/alertQueue 변화 반영)
  useEffect(() => {
    void loadCard()
  }, [loadCard])

  // weather poll: 1시간마다. 404 등은 silent 무시.
  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const gps = await getCurrentGps()
        const w = await apiFetch<WeatherResponse>(`/api/weather?lat=${gps.lat}&lng=${gps.lng}`)
        if (cancelled) return
        // 비 오거나 1시간 내 강수 임계 → ALERT
        if (w.raining || (w.alertWindowMin > 0 && w.alertWindowMin <= 60)) {
          pushAlert({
            ts: Date.now(),
            type: 'weather',
            detail: w.raining ? '지금 비' : `${w.alertWindowMin}분 안에 비`,
          })
        }
      } catch {
        // weather endpoint 미구현 또는 권한 거부 — 조용히 패스
      }
    }
    const id = setInterval(tick, WEATHER_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [pushAlert])

  // alertQueue 변동 시 카드 타입 swap (현재 카드 유지, type 만 변경).
  // functional setState 로 prev state 접근 → state 의존성 제거.
  useEffect(() => {
    const top = alertQueue[0]
    if (!top) return
    setState((prev) => {
      if (prev.status !== 'ready') return prev
      const next = resolveNextCard(
        { glow: prev.card.type === 'NORMAL' ? 'normal' : 'alert', cardType: prev.card.type },
        {
          kind: top.type === 'weather' ? 'weather-alert' : 'poi-closed',
          payload: top,
        },
      )
      if (next.cardType === prev.card.type) return prev
      setGlow(next.glow)
      return {
        status: 'ready',
        card: { ...prev.card, type: next.cardType },
      }
    })
  }, [alertQueue, setGlow])

  const onAck = useCallback(() => {
    acknowledgeAlert()
    setState((prev) => {
      if (prev.status !== 'ready') return prev
      const next = resolveNextCard(
        { glow: prev.card.type === 'NORMAL' ? 'normal' : 'alert', cardType: prev.card.type },
        { kind: 'ack' },
      )
      if (next.cardType === prev.card.type) return prev
      setGlow(next.glow)
      return { status: 'ready', card: { ...prev.card, type: next.cardType } }
    })
  }, [acknowledgeAlert, setGlow])

  const onMapPress = useCallback(() => {
    // Phase 4d (D31) — 지도 모달 C (⊕) slide-up
    setMapOpen(true)
  }, [])

  const onMapClose = useCallback(() => {
    setMapOpen(false)
  }, [])

  const onLetterPress = useCallback(() => {
    // D38 — SPECIAL 편지 일정 modal slide-up
    setLetterOpen(true)
  }, [])

  const onLetterClose = useCallback(() => {
    setLetterOpen(false)
  }, [])

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: lightColors.bg,
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.lg,
      }}
    >
      {/* 상단 header — ink mark + 지도 모달 진입 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.lg,
        }}
      >
        <InkMark glow={glow} size={56} />
        <Pressable
          accessibilityLabel="지도 보기"
          onPress={onMapPress}
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: lightColors.line,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: lightColors.bgElev,
          }}
        >
          <Text
            style={{
              color: lightColors.celadon,
              fontFamily: fonts.family.ui,
              fontSize: 20,
              lineHeight: 22,
            }}
          >
            +
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}
        showsVerticalScrollIndicator={false}
      >
        {state.status === 'loading' ? <LoadingBlock /> : null}

        {state.status === 'away' ? (
          <AwayBlock copy={AWAY_COPY[state.reason]} onRetry={() => void loadCard()} />
        ) : null}

        {state.status === 'ready' ? (
          <View>
            <MomentCard
              card={state.card}
              alertCopy={
                state.card.type === 'ALERT' && alertQueue[0]
                  ? ALERT_COPY[alertQueue[0].type]
                  : undefined
              }
            />
            {state.card.type === 'ALERT' || state.card.type === 'RESCUE' ? (
              <Pressable
                onPress={onAck}
                hitSlop={8}
                style={{
                  marginTop: spacing.md,
                  alignSelf: 'flex-start',
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: lightColors.celadon,
                }}
              >
                <Text
                  style={{
                    color: lightColors.celadon,
                    fontFamily: fonts.family.ui,
                    fontSize: fonts.size.caption,
                  }}
                >
                  괜찮아, 고마워
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* D38 — SPECIAL 편지 일정 진입점. activeRoute + activeTrip 있을 때만 렌더. */}
      {activeTrip && activeRoute ? (
        <View
          style={{
            position: 'absolute',
            right: spacing.lg,
            bottom: insets.bottom + spacing.md,
          }}
        >
          <Pressable
            onPress={onLetterPress}
            accessibilityRole="button"
            accessibilityLabel="편지로 보기"
            hitSlop={8}
            style={({ pressed }) => ({
              paddingVertical: spacing.xs + 2,
              paddingHorizontal: spacing.sm,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fonts.family.voice,
                fontSize: 12,
                fontStyle: 'italic',
                color: lightColors.celadon,
                textDecorationLine: 'underline',
              }}
            >
              ↳ 편지로 보기
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Phase 4d 지도 모달 — slide-up 풀스크린 */}
      <CompanionMap visible={mapOpen} onClose={onMapClose} />

      {/* v1.6 (D38) 편지 일정 SPECIAL — slide-up 풀스크린 */}
      {activeTrip && activeRoute ? (
        <LetterItinerary
          visible={letterOpen}
          onClose={onLetterClose}
          trip={activeTrip}
          activeRoute={activeRoute}
        />
      ) : null}
    </View>
  )
}

function LoadingBlock() {
  return (
    <View
      style={{
        backgroundColor: lightColors.bgElev,
        borderRadius: radius.card,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: lightColors.lineSoft,
      }}
    >
      <Text
        style={{
          color: lightColors.textSoft,
          fontFamily: fonts.family.voice,
          fontSize: fonts.size.body,
          lineHeight: fonts.size.body * fonts.lineHeight.voice,
        }}
      >
        근처를 잠깐 둘러볼게…
      </Text>
    </View>
  )
}

function AwayBlock({ copy, onRetry }: { copy: string; onRetry: () => void }) {
  return (
    <View
      style={{
        backgroundColor: lightColors.bgElev,
        borderRadius: radius.card,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: lightColors.line,
        opacity: 0.7,
      }}
    >
      <View
        style={{
          paddingLeft: spacing.md,
          borderLeftWidth: 2,
          borderLeftColor: lightColors.celadon,
        }}
      >
        <Text
          style={{
            color: lightColors.text,
            fontFamily: fonts.family.voice,
            fontSize: fonts.size.bodyLarge,
            lineHeight: fonts.size.bodyLarge * fonts.lineHeight.voice,
          }}
        >
          {copy}
        </Text>
      </View>
      <Pressable
        onPress={onRetry}
        hitSlop={8}
        style={{
          marginTop: spacing.md,
          alignSelf: 'flex-start',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: lightColors.celadon,
        }}
      >
        <Text
          style={{
            color: lightColors.celadon,
            fontFamily: fonts.family.ui,
            fontSize: fonts.size.caption,
          }}
        >
          다시 시도
        </Text>
      </Pressable>
    </View>
  )
}
