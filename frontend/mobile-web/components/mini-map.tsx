import { LinearGradient } from 'expo-linear-gradient'
import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg'

import { MicIcon } from '@/components/icons/mic'
import { InkMark } from '@/components/ink-mark'
import { PoiPin } from '@/components/poi-pin'
import { lightColors } from '@/theme'
import * as fonts from '@/theme/fonts'
import { radius } from '@/theme/spacing'

/**
 * Phase 4d (D31) — stylized 미니맵 (design-preview line 1968-2001 직역).
 *
 *  - 한지 톤 베이지 그라데이션 (135deg #E8E4DA → #DDD8CC → #C9C3B6)
 *  - 청자 32px 그리드 overlay (rgba(74,111,165,0.06) stroke)
 *  - 수평/수직 도로 stub (rgba(31,31,31,0.08) 먹 흐림)
 *  - 중앙 큰 잉크 마크 (48x48 celadon)
 *  - POI 핀 normalize: lat/lng → 화면 % (±0.006° / ±0.0075° → 클램프 8-92% / 12-78%)
 *  - 좌상단 × 닫기 / 우상단 🎙️ 음성 토글 (44x44 bg-elev + line-strong + 그림자)
 *  - floating voice 인용 (옵셔널, bg-elev 카드 + InkMark + Noto Serif KR 13px)
 *
 * react-native-maps 의존 X. D29 정신 일관 (색/그라데이션 + SVG · v1 "직전 제일").
 */

interface MiniMapPoi {
  id: string
  lat: number
  lng: number
  name: string
  category: string
  distanceMin?: number
}

export interface MiniMapProps {
  /** 화면 중앙 (사용자 현재 위치) */
  center: { lat: number; lng: number }
  /** POI 핀 list — 화면 안 normalize 됨 */
  pois: MiniMapPoi[]
  /** 미니맵 영역 height (default 240) */
  height?: number
  /** 우상단 음성 토글 onPress (옵셔널 — v1 visual only) */
  onVoicePress?: () => void
  /** 좌상단 × 닫기 onPress */
  onClose: () => void
  /** floating voice 인용 (옵셔널) */
  voiceText?: string
}

// 화면 normalize 반경 (대략 1.3km × 1.3km 영역)
const LAT_RANGE = 0.012
const LNG_RANGE = 0.015

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// design-preview 그리드/도로 색 — GRID_STROKE/ROAD_INK 은 미니맵 전용 미세 alpha
// (theme 토큰 추가 가치 낮음 — mini-map 한 곳만 사용)
const GRID_STROKE = 'rgba(74,111,165,0.06)'
const ROAD_INK = 'rgba(31,31,31,0.08)'
// LINE_STRONG 은 D39 P3 polish 에서 theme.lineStrong 으로 이동 (3 곳 공통 사용)
const LINE_STRONG = lightColors.lineStrong
const PAPER_BG_COLORS = ['#E8E4DA', '#DDD8CC', '#C9C3B6'] as const

export function MiniMap({
  center,
  pois,
  height = 240,
  onVoicePress,
  onClose,
  voiceText,
}: MiniMapProps) {
  const normalized = useMemo(
    () =>
      pois.map((p) => {
        const dx = (p.lng - center.lng) / LNG_RANGE
        const dy = (center.lat - p.lat) / LAT_RANGE
        const left = clamp((0.5 + dx) * 100, 8, 92)
        const top = clamp((0.5 + dy) * 100, 12, 78)
        return { poi: p, left, top }
      }),
    [pois, center.lat, center.lng],
  )

  return (
    <View style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
      {/* 한지 톤 베이지 그라데이션 background */}
      <LinearGradient
        colors={[...PAPER_BG_COLORS]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* 청자 32px 그리드 overlay — SVG Pattern */}
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
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="grid" width={32} height={32} patternUnits="userSpaceOnUse">
              <Path d="M 32 0 L 0 0 0 32" fill="none" stroke={GRID_STROKE} strokeWidth={1} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#grid)" />
        </Svg>
      </View>

      {/* 도로 stub — 수평 50% / 수직 55% */}
      <View
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: ROAD_INK,
          pointerEvents: 'none',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '55%',
          width: 2,
          backgroundColor: ROAD_INK,
          pointerEvents: 'none',
        }}
      />

      {/* 중앙 큰 잉크 마크 (사용자 위치) — 48x48 celadon */}
      <View
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 48,
          height: 48,
          marginLeft: -24,
          marginTop: -24,
          pointerEvents: 'none',
        }}
      >
        <InkMark size={48} glow="normal" />
      </View>

      {/* POI 핀 — normalize 된 % 위치 */}
      {normalized.map(({ poi, left, top }) => (
        <View
          key={poi.id}
          style={{
            position: 'absolute',
            left: `${left}%`,
            top: `${top}%`,
            // 핀 wrapper 의 중심 (24x24 핀 기준 -12, -12) — Text 라벨 포함 살짝 위로
            marginLeft: -12,
            marginTop: -12,
            pointerEvents: 'none',
          }}
        >
          <PoiPin
            category={poi.category}
            distanceMin={poi.distanceMin}
            size={poi.category === 'CT1' ? 22 : 24}
          />
        </View>
      ))}

      {/* floating voice 인용 (옵셔널) */}
      {voiceText ? (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 12,
            backgroundColor: lightColors.bgElev,
            borderWidth: 1,
            borderColor: lightColors.line,
            borderRadius: radius.card,
            paddingVertical: 10,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            shadowColor: lightColors.text,
            shadowOpacity: 0.08,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 16,
            elevation: 3,
          }}
        >
          <View style={{ width: 16, height: 16 }}>
            <InkMark size={16} glow="normal" />
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.family.voice,
              fontSize: 13,
              lineHeight: 13 * 1.45,
              color: lightColors.text,
            }}
          >
            {voiceText}
          </Text>
        </View>
      ) : null}

      {/* × 닫기 (좌상단) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="지도 닫기"
        onPress={onClose}
        hitSlop={6}
        style={({ pressed }) => ({
          position: 'absolute',
          left: 14,
          top: 14,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: lightColors.bgElev,
          borderWidth: 1,
          borderColor: LINE_STRONG,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: lightColors.text,
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 2,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            fontFamily: fonts.family.ui,
            fontSize: 15,
            color: lightColors.textMuted,
            lineHeight: 18,
          }}
        >
          ×
        </Text>
      </Pressable>

      {/* 🎙️ 음성 토글 (우상단) — v1 visual only */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="음성 모드"
        onPress={onVoicePress}
        disabled={!onVoicePress}
        hitSlop={6}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 14,
          top: 14,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: lightColors.bgElev,
          borderWidth: 1,
          borderColor: LINE_STRONG,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: lightColors.text,
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 2,
          opacity: pressed && onVoicePress ? 0.7 : !onVoicePress ? 0.75 : 1,
        })}
      >
        <MicIcon size={20} color={lightColors.textMuted} />
      </Pressable>
    </View>
  )
}
