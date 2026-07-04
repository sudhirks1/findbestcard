import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoreCategory, StoreVisit, HabitEntry } from '../types';
import { updateHabit } from '../utils/learning';
import * as api from '../utils/api';

function getToken(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAuthStore } = require('./useAuthStore');
    return useAuthStore.getState().token;
  } catch {
    return null;
  }
}

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface HabitStore {
  visits: StoreVisit[];
  habits: HabitEntry[];
  recordVisit: (params: {
    storeName: string;
    storeCategory: StoreCategory;
    recommendedCardId: string;
    usedCardId: string;
    overrideReason?: string;
  }) => void;
  clearHistory: () => void;
}

export const useHabitStore = create<HabitStore>()(
  persist(
    (set) => ({
      visits: [],
      habits: [],

      recordVisit: ({ storeName, storeCategory, recommendedCardId, usedCardId, overrideReason }) => {
        const visit: StoreVisit = {
          id: uuid(),
          storeName,
          storeCategory,
          timestamp: Date.now(),
          recommendedCardId,
          usedCardId,
          followedRecommendation: recommendedCardId === usedCardId,
          overrideReason,
        };
        set((s) => ({
          visits: [visit, ...s.visits].slice(0, 200),
          habits: updateHabit(s.habits, storeCategory, usedCardId),
        }));
        const token = getToken();
        if (token) {
          api.recordHabit(token, {
            storeName: visit.storeName,
            storeCategory: visit.storeCategory,
            recommendedCardId: visit.recommendedCardId,
            usedCardId: visit.usedCardId,
            overrideReason: visit.overrideReason,
          }).catch(() => {});
        }
      },

      clearHistory: () => set({ visits: [], habits: [] }),
    }),
    {
      name: 'card-rewards-habits',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
