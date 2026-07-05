import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../utils/api';
import { UserRole } from '../types';

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  role: UserRole | null;
  _hasHydrated: boolean;
  setHydrated: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithApple: (params: { identityToken: string; appleUserId: string; email?: string; displayName?: string }) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      email: null,
      displayName: null,
      role: null,
      _hasHydrated: false,

      setHydrated: () => set({ _hasHydrated: true }),

      login: async (email, password) => {
        const data = await api.login(email, password);
        set({
          token: data.accessToken,
          userId: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          role: data.user.role ?? 'user',
        });
      },

      register: async (email, password, displayName) => {
        const data = await api.register(email, password, displayName);
        set({
          token: data.accessToken,
          userId: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          role: data.user.role ?? 'user',
        });
      },

      loginWithApple: async (params) => {
        const data = await api.appleAuth(params);
        set({
          token: data.accessToken,
          userId: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          role: data.user.role ?? 'user',
        });
      },

      logout: () => set({ token: null, userId: null, email: null, displayName: null, role: null }),
    }),
    {
      name: 'auth-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ token: s.token, userId: s.userId, email: s.email, displayName: s.displayName, role: s.role }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
