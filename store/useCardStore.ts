import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreditCard } from '../types';
import * as api from '../utils/api';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface CardStore {
  cards: CreditCard[];
  isLoading: boolean;
  hasSeeded: boolean;
  fetchFromServer: () => Promise<void>;
  clearCards: () => void;
  addCard: (card: Omit<CreditCard, 'id' | 'createdAt'>) => Promise<void>;
  updateCard: (id: string, updates: Partial<Omit<CreditCard, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
}

function getToken(): string | null {
  try {
    const { useAuthStore } = require('./useAuthStore');
    return useAuthStore.getState().token;
  } catch {
    return null;
  }
}

export const useCardStore = create<CardStore>()(
  persist(
    (set, get) => ({
      cards: [],
      isLoading: false,
      hasSeeded: false,

      clearCards: () => set({ cards: [], hasSeeded: false }),

      fetchFromServer: async () => {
        const token = getToken();
        if (!token) return;
        set({ isLoading: true });
        try {
          const serverCards = await api.getWallet(token);
          if (serverCards.length > 0) {
            // Server has cards — always authoritative
            set({ cards: serverCards.map(api.serverCardToLocal), hasSeeded: true });
          } else if (!get().hasSeeded) {
            // Genuinely new/empty account
            set({ cards: [], hasSeeded: true });
          }
          // If server returns 0 and we already have local data, keep it —
          // could be a stale token from a different account session
        } catch {
          // Keep local cache on network failure
        } finally {
          set({ isLoading: false });
        }
      },

      addCard: async (card) => {
        const id = uuid();
        const newCard: CreditCard = { ...card, id, createdAt: Date.now() };
        set((s) => ({ cards: [...s.cards, newCard] }));
        const token = getToken();
        if (token) {
          try {
            const dto = api.localCardToServer(newCard, get().cards.length - 1);
            const saved = await api.addWalletCard(token, dto);
            // Replace local ID with server-assigned ID
            if (saved?.id && saved.id !== id) {
              set((s) => ({
                cards: s.cards.map((c) => c.id === id ? { ...c, id: saved.id } : c),
              }));
            }
          } catch {}
        }
      },

      updateCard: async (id, updates) => {
        set((s) => ({
          cards: s.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
        const token = getToken();
        if (token) {
          try {
            const updated = get().cards.find((c) => c.id === id);
            if (updated) {
              const idx = get().cards.findIndex((c) => c.id === id);
              await api.updateWalletCard(token, id, api.localCardToServer(updated, idx));
            }
          } catch {}
        }
      },

      deleteCard: async (id) => {
        set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
        const token = getToken();
        if (token) {
          try {
            await api.deleteWalletCard(token, id);
          } catch {}
        }
      },
    }),
    {
      name: 'card-rewards-cards-v4',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
