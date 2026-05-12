import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { UserStyle } from '@trip/types'

type UserStyleStore = UserStyle & {
  addLike: (poiId: string) => void
  addDislike: (poiId: string) => void
  setTags: (tags: string[]) => void
}

export const useUserStyle = create<UserStyleStore>()(
  persist(
    (set) => ({
      tags: [],
      likedPoiIds: [],
      dislikedPoiIds: [],
      addLike: (poiId) =>
        set((s) => ({
          likedPoiIds: s.likedPoiIds.includes(poiId) ? s.likedPoiIds : [...s.likedPoiIds, poiId],
        })),
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
