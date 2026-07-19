import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subscription } from '../types';
import * as api from '../utils/api';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getToken(): string | null {
  try {
    const { useAuthStore } = require('./useAuthStore');
    return useAuthStore.getState().token;
  } catch {
    return null;
  }
}

function serverToLocal(s: any): Subscription {
  return {
    id: s.id,
    name: s.name,
    amount: Number(s.amount),
    period: s.period as 'monthly' | 'annual',
    cardId: s.cardId,
    notes: s.notes,
    createdAt: new Date(s.createdAt).getTime(),
  };
}

interface SubscriptionStore {
  subscriptions: Subscription[];
  fetchFromServer: () => Promise<void>;
  clearSubscriptions: () => void;
  addSubscription: (sub: Omit<Subscription, 'id' | 'createdAt'>) => Promise<void>;
  updateSubscription: (id: string, updates: Partial<Omit<Subscription, 'id' | 'createdAt'>>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      subscriptions: [],

      clearSubscriptions: () => set({ subscriptions: [] }),

      fetchFromServer: async () => {
        const token = getToken();
        if (!token) return;
        try {
          const data = await api.getSubscriptions(token);
          if (data.length > 0) {
            // Server has data — always authoritative
            set({ subscriptions: data.map(serverToLocal) });
          }
          // If server returns 0, keep local cache — could be a wrong/stale token
        } catch {}
      },

      addSubscription: async (sub) => {
        const id = uuid();
        const newSub: Subscription = { ...sub, id, createdAt: Date.now() };
        set((s) => ({ subscriptions: [...s.subscriptions, newSub] }));
        const token = getToken();
        if (token) {
          try {
            const saved = await api.addSubscription(token, {
              name: sub.name, amount: sub.amount, period: sub.period, cardId: sub.cardId, notes: sub.notes,
            });
            if (saved?.id && saved.id !== id) {
              set((s) => ({
                subscriptions: s.subscriptions.map((x) => x.id === id ? { ...x, id: saved.id } : x),
              }));
            }
          } catch {}
        }
      },

      updateSubscription: async (id, updates) => {
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub)),
        }));
        const token = getToken();
        if (token) {
          api.updateSubscription(token, id, updates).catch(() => {});
        }
      },

      deleteSubscription: async (id) => {
        set((s) => ({ subscriptions: s.subscriptions.filter((sub) => sub.id !== id) }));
        const token = getToken();
        if (token) api.deleteSubscription(token, id).catch(() => {});
      },
    }),
    {
      name: 'subscription-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
