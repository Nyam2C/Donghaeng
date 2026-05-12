import type { GpsCoord } from '@trip/types'

export async function getCurrentGps(): Promise<GpsCoord> {
  throw new Error('NotImplemented · Phase 4 타겟')
}

export function subscribeGps(_onUpdate: (gps: GpsCoord) => void): () => void {
  throw new Error('NotImplemented · Phase 4 타겟')
}
