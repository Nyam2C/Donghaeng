import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, Text, View } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import type { LLMRouteUpdate } from '@trip/types'

import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius } from '@/theme/spacing'

/**
 * D34 — SCENARIO 08 인라인 동선 변경 카드.
 *
 * design-preview line 2492-2523 직역. 채팅 안 turns 사이에 인라인으로 박혀
 * "동선이 이렇게 바뀌어요" 시각화 + CTA 2개 (다른 곳도 / 이대로) 제공.
 *
 * 구조:
 *  - container: padding 14, radius cardLarge(14), border 1 celadon, bg celadonTint, marginBottom 18
 *  - header row: "동선 업데이트" Noto Serif 14 weight 500 (좌)
 *                + "+ {N} stop" Fraunces italic 12 celadon (우, baseline)
 *  - 미니맵 48px: 110deg LinearGradient (청자 → 청자 soft → 녹청)
 *                + radial overlay 2개 (흰빛 0.2 + 0.18) — design-preview line 2498-2499
 *  - stops list (Noto Serif 12, lineHeight 1.55, gap 6):
 *      각 stop = 점 (6x6 radius 50%) + "{시간대} · {name}" + 상태 라벨
 *      유지 stops → celadon 점 + textMuted "유지"
 *      새 추가 stop → juhong 점 + Fraunces italic celadon "새로 추가"
 *  - stats (DM Mono 11, gap 14, textMuted, marginTop 12):
 *      "+{ΔtravelMin} 이동" · "{stopsCount} stops" · "− {moodLabel} ★*moodStars"
 *  - CTA row (marginTop 12, paddingTop 12, gap 10):
 *      "다른 곳도" ghost (border line · bg bgElev · textMuted)
 *      "이대로" celadon bg · bgElev text (확정 액션, single primary)
 *
 * 시그니처 freeze (D12) — 신규 컴포넌트 (D34 명시 허용).
 */

interface RouteUpdateCardProps {
  routeUpdate: LLMRouteUpdate
  /** 이전 동선의 stops 개수 — "+ N stop" 헤더와 "+30 이동" stats 의 Δ 계산용 */
  oldStopsCount: number
  /** 이전 동선의 travelMin — stats 의 "+{Δ} 이동" 계산용 */
  oldTravelMin: number
  onConfirm: () => void
  onAskMore: () => void
  /** 확정 후 disabled 표시 (UI 상 selected 상태) — 옵셔널 */
  confirmed?: boolean
}

/** stop.order (1-based) → 시간대 라벨. 4 stop 가정 매핑 (design-preview 직역). */
function orderToTimeOfDay(order: number): string {
  if (order === 1) return '오전'
  if (order === 2) return '점심'
  if (order === 3) return '오후'
  return '저녁'
}

function moodStarsText(stars: number): string {
  const safe = Math.max(0, Math.min(5, Math.round(stars)))
  return '★'.repeat(safe)
}

// design-preview line 2498 미니맵 gradient — SCENARIO 08 전용 청자→청자 soft→녹청 (110deg).
// (GradientMiniMap 의 letter A/B/C 색과는 다른 mood — "동선 update" 청자 결.)
const UPDATE_GRADIENT_COLORS = ['#4A6FA5', '#6B89B5', '#88B098'] as const
const UPDATE_GRADIENT_LOCATIONS = [0, 0.5, 1] as const
// 110deg 변환 (GradientMiniMap 과 동일 sin/cos)
const GRADIENT_START = { x: 0.03, y: 0.33 } as const
const GRADIENT_END = { x: 0.97, y: 0.67 } as const

interface MiniMapProps {
  height: number
}

function UpdateMiniMap({ height }: MiniMapProps) {
  return (
    <View
      style={{
        width: '100%',
        height,
        borderRadius: radius.small,
        overflow: 'hidden',
        marginBottom: 10,
      }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <LinearGradient
        colors={[...UPDATE_GRADIENT_COLORS]}
        locations={[...UPDATE_GRADIENT_LOCATIONS]}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={{ width: '100%', height: '100%' }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
        }}
      >
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <RadialGradient
              id="rcup-glow1"
              cx="30%"
              cy="50%"
              rx="30%"
              ry="30%"
              fx="30%"
              fy="50%"
              gradientUnits="objectBoundingBox"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.2} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient
              id="rcup-glow2"
              cx="78%"
              cy="60%"
              rx="28%"
              ry="28%"
              fx="78%"
              fy="60%"
              gradientUnits="objectBoundingBox"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.18} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#rcup-glow1)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#rcup-glow2)" />
        </Svg>
      </View>
    </View>
  )
}

interface StopRowProps {
  stopName: string
  timeOfDay: string
  isNew: boolean
}

function StopRow({ stopName, timeOfDay, isNew }: StopRowProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: isNew ? lightColors.juhong : lightColors.celadon,
        }}
      />
      <Text
        style={{
          fontFamily: fonts.family.voice,
          fontSize: 12,
          color: lightColors.text,
          lineHeight: 19, // 12 * 1.55 ≈ 18.6 → 19
          flex: 1,
        }}
      >
        <Text style={{ fontWeight: '700' }}>{timeOfDay}</Text>
        {` · ${stopName} — `}
        {isNew ? (
          <Text
            style={{
              fontFamily: fonts.family.numeric,
              fontStyle: 'italic',
              color: lightColors.celadon,
            }}
          >
            새로 추가
          </Text>
        ) : (
          <Text style={{ color: lightColors.textMuted }}>유지</Text>
        )}
      </Text>
    </View>
  )
}

export function RouteUpdateCard({
  routeUpdate,
  oldStopsCount,
  oldTravelMin,
  onConfirm,
  onAskMore,
  confirmed = false,
}: RouteUpdateCardProps) {
  const newStopsCount = routeUpdate.route.stops.length
  const deltaStops = Math.max(0, newStopsCount - oldStopsCount)
  const deltaMin = Math.max(0, routeUpdate.route.travelMin - oldTravelMin)
  const moodLabel = routeUpdate.route.moodLabel ?? ''
  const starsText = moodStarsText(routeUpdate.route.moodStars)
  const addedName = routeUpdate.addedStopName ?? ''

  // stops 를 order 오름차순 정렬 후 시간대 매핑.
  const orderedStops = [...routeUpdate.route.stops].sort((a, b) => a.order - b.order)

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`동선 업데이트, ${addedName} 추가됨`}
      style={{
        marginBottom: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: lightColors.celadon,
        borderRadius: radius.cardLarge,
        backgroundColor: lightColors.celadonTint,
      }}
    >
      {/* 헤더 row — "동선 업데이트" + "+ N stop" */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.family.voice,
            fontSize: 14,
            fontWeight: '500',
            color: lightColors.text,
          }}
        >
          동선 업데이트
        </Text>
        <Text
          style={{
            fontFamily: fonts.family.numeric,
            fontStyle: 'italic',
            fontSize: 12,
            color: lightColors.celadon,
          }}
        >
          + {deltaStops} stop
        </Text>
      </View>

      {/* 미니맵 48px */}
      <UpdateMiniMap height={48} />

      {/* stops list */}
      <View style={{ flexDirection: 'column', gap: 6 }}>
        {orderedStops.map((stop) => {
          const isNew =
            addedName.length > 0 &&
            (stop.poi_id === addedName ||
              stop.poi_id.toLowerCase().includes(addedName.toLowerCase()) ||
              // 추가 stop 위치 휴리스틱: addedName 매칭 안되면 가장 큰 order 가 추가된 stop 으로 간주
              (oldStopsCount > 0 && stop.order > oldStopsCount))
          // 추가 stop 의 표시 이름 = addedName 우선, 없으면 poi_id 그대로.
          const displayName =
            isNew && addedName.length > 0 && stop.order > oldStopsCount ? addedName : stop.poi_id
          return (
            <StopRow
              key={`${stop.poi_id}-${stop.order}`}
              stopName={displayName}
              timeOfDay={orderToTimeOfDay(stop.order)}
              isNew={isNew}
            />
          )
        })}
      </View>

      {/* stats row — "+{Δ} 이동 · {N} stops · − {moodLabel} ★★★" */}
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: fonts.family.mono, fontSize: 11, color: lightColors.text }}>
            {`+${deltaMin}`}
          </Text>
          <Text
            style={{
              fontFamily: fonts.family.mono,
              fontSize: 11,
              color: lightColors.textMuted,
              marginLeft: 4,
            }}
          >
            이동
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: fonts.family.mono, fontSize: 11, color: lightColors.text }}>
            {newStopsCount}
          </Text>
          <Text
            style={{
              fontFamily: fonts.family.mono,
              fontSize: 11,
              color: lightColors.textMuted,
              marginLeft: 4,
            }}
          >
            stops
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            style={{ fontFamily: fonts.family.mono, fontSize: 11, color: lightColors.textMuted }}
          >
            {'− '}
          </Text>
          {moodLabel.length > 0 ? (
            <Text
              style={{
                fontFamily: fonts.family.mono,
                fontSize: 11,
                color: lightColors.text,
                marginRight: 4,
              }}
            >
              {moodLabel}
            </Text>
          ) : null}
          {starsText.length > 0 ? (
            <Text
              style={{
                fontFamily: fonts.family.mono,
                fontSize: 11,
                color: lightColors.textMuted,
              }}
            >
              {starsText}
            </Text>
          ) : null}
        </View>
      </View>

      {/* CTA row — "다른 곳도" (ghost) + "이대로" (celadon) */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          marginTop: 12,
          paddingTop: 12,
        }}
      >
        <Pressable
          onPress={onAskMore}
          disabled={confirmed}
          accessibilityRole="button"
          accessibilityLabel="다른 곳도 추가 발화"
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: lightColors.line,
            borderRadius: radius.cardLarge,
            backgroundColor: lightColors.bgElev,
            alignItems: 'center',
            opacity: confirmed ? 0.4 : pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 14,
              color: lightColors.textMuted,
            }}
          >
            다른 곳도
          </Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          disabled={confirmed}
          accessibilityRole="button"
          accessibilityLabel="이대로 동선 확정"
          accessibilityState={{ selected: confirmed }}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: radius.cardLarge,
            backgroundColor: lightColors.celadon,
            alignItems: 'center',
            opacity: confirmed ? 0.5 : pressed ? 0.9 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fonts.family.voice,
              fontSize: 14,
              fontWeight: '500',
              color: lightColors.bgElev,
            }}
          >
            {confirmed ? '확정됨' : '이대로'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
