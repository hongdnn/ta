import { create } from 'zustand';
import { login as loginApi, register as registerApi } from '@/api/auth';
import { setAccessTokenGetter } from '@/api/apiClient';
import { clearStoredAuth, DEFAULT_ACCESS_TOKEN, loadStoredAuth, saveStoredAuth } from '@/auth/storage';
import type { AuthSession, AuthUser } from '@/auth/types';
import type { LoginPayload, RegisterPayload } from '@/api/auth';

type AuthStore = {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  getResolvedToken: () => string | null;
  setAuthSession: (session: AuthSession) => void;
  setAuthTokenOnly: (token: string) => void;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  register: (payload: RegisterPayload) => Promise<AuthSession>;
  clearAuth: () => void;
};

const initial = loadStoredAuth();

export const useAuthStore = create<AuthStore>((set, get) => ({
  accessToken: initial.accessToken,
  user: initial.user,
  isAuthenticated: !!initial.accessToken,

  getResolvedToken: () => get().accessToken ?? DEFAULT_ACCESS_TOKEN ?? null,

  setAuthSession: (session) => {
    const token = session.access_token;
    const user = session.user;
    saveStoredAuth({ accessToken: token, user });
    set({
      accessToken: token,
      user,
      isAuthenticated: true,
    });
  },

  setAuthTokenOnly: (token) => {
    saveStoredAuth({ accessToken: token, user: null });
    set({
      accessToken: token,
      user: null,
      isAuthenticated: true,
    });
  },

  login: async (payload) => {
    const session = await loginApi(payload);
    get().setAuthSession(session);
    return session;
  },

  register: async (payload) => {
    const session = await registerApi(payload);
    get().setAuthSession(session);
    return session;
  },

  clearAuth: () => {
    clearStoredAuth();
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    });
  },
}));

export function initializeAuth(): void {
  setAccessTokenGetter(() => useAuthStore.getState().getResolvedToken());
}
