import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClaudeMessage } from '../utils/claudeApi';

interface AIStore {
  apiKey: string;
  setApiKey: (key: string) => void;
  messages: ClaudeMessage[];
  addMessage: (msg: ClaudeMessage) => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIStore>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: (key) => set({ apiKey: key.trim() }),
      messages: [],
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'card-rewards-ai-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
