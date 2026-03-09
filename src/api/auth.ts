import { apiClient } from './apiClient';
import type { AuthSession } from '@/auth/types';

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  name: string;
  password: string;
  user_type: 'student' | 'professor';
  institution_ids: string[];
};

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const response = await apiClient.post<AuthSession>('/api/auth/login', payload);
  return response.data;
}

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  const response = await apiClient.post<AuthSession>('/api/auth/register', payload);
  return response.data;
}

