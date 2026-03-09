import { apiClient } from './client';
import type { AuthSession } from '@web/auth/types';

export type LoginPayload = {
  email: string;
  password: string;
};

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const response = await apiClient.post<AuthSession>('/api/auth/login', payload);
  return response.data;
}

