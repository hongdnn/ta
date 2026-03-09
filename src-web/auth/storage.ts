import type { AuthUser } from './types';

const AUTH_STORAGE_KEY = 'ta.web.auth.v1';

type StoredAuth = {
  accessToken: string | null;
  user: AuthUser | null;
};

export function loadStoredAuth(): StoredAuth {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { accessToken: null, user: null };
    const parsed = JSON.parse(raw) as StoredAuth;
    return {
      accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : null,
      user: parsed.user ?? null,
    };
  } catch {
    return { accessToken: null, user: null };
  }
}

export function saveStoredAuth(data: StoredAuth): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore local storage errors
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore local storage errors
  }
}

