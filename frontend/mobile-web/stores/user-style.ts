import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { LikedPoiMeta, UserStyle } from '@trip/types'

/**
 * D40 (v1.8) — addLike 시그니처에 옵셔널 meta 추가. caller 가 POI 이름/카테고리 함께 박으면
 * likedPois map 에 누적 → SCENARIO 04 recommendRoutes 가 poiNames 로 LLM 에 전달 →
 * letter 본문에 진짜 POI 이름 ("안목 해변" 등) 사용.
 *
 * 기존 caller (`addLike(id)` 만) 도 그대로 동작 — meta 옵셔널이라 likedPois 갱신만 skip.
 */
type UserStyleStore = UserStyle & {
  addLike: (poiId: string, meta?: LikedPoiMeta) => void
  addDislike: (poiId: string) => void
  setTags: (tags: string[]) => void
}

export const useUserStyle = create<UserStyleStore>()(
  persist(
    (set) => ({
      tags: [],
      likedPoiIds: [],
      dislikedPoiIds: [],
      likedPois: undefined,
      addLike: (poiId, meta) =>
        set((s) => {
          const nextIds = s.likedPoiIds.includes(poiId) ? s.likedPoiIds : [...s.likedPoiIds, poiId]
          if (!meta) {
            return { likedPoiIds: nextIds }
          }
          const prevMap = s.likedPois ?? {}
          // 동일 id 의 meta 가 이미 박혔으면 덮어쓰지 않음 (먼저 박은 게 진실)
          const nextMap = prevMap[poiId] ? prevMap : { ...prevMap, [poiId]: meta }
          return { likedPoiIds: nextIds, likedPois: nextMap }
        }),
      addDislike: (poiId) =>
        set((s) => ({
          dislikedPoiIds: s.dislikedPoiIds.includes(poiId)
            ? s.dislikedPoiIds
            : [...s.dislikedPoiIds, poiId],
        })),
      setTags: (tags) => set({ tags }),
    }),
    { name: 'user-style', storage: createJSONStorage(() => AsyncStorage) },
  ),
)
