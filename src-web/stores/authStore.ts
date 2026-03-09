import { create } from 'zustand';
import { login as loginApi } from '@web/api/auth';
import type { LoginPayload } from '@web/api/auth';
import { setAccessTokenGetter } from '@web/api/client';
import { clearStoredAuth, loadStoredAuth, saveStoredAuth } from '@web/auth/storage';
import type { AuthSession, AuthUser } from '@web/auth/types';

type AuthStore = {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuthSession: (session: AuthSession) => void;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  clearAuth: () => void;
  getAccessToken: () => string | null;
};

const initial = loadStoredAuth();

export const useAuthStore = create<AuthStore>((set, get) => ({
  accessToken: initial.accessToken,
  user: initial.user,
  isAuthenticated: !!initial.accessToken,

  setAuthSession: (session) => {
    saveStoredAuth({
      accessToken: session.access_token,
      user: session.user,
    });
    set({
      accessToken: session.access_token,
      user: session.user,
      isAuthenticated: true,
    });
  },

  login: async (payload) => {
    const session = await loginApi(payload);
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

  getAccessToken: () => get().accessToken,
}));

export function initializeAuth(): void {
  setAccessTokenGetter(() => useAuthStore.getState().getAccessToken());
}

