// @trip/types — Moment card (현장 컴패니언 4 카드 타입)

import type { KakaoPOI } from './poi'

export type CardType = 'NORMAL' | 'ALERT' | 'RESCUE' | 'AWAY'

export interface MomentCard {
  type: CardType
  poi: KakaoPOI
  note: string
  variant: 'large' | 'compact'
}
