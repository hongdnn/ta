import axios, { AxiosError } from 'axios';

type AccessTokenGetter = () => string | null;

let accessTokenGetter: AccessTokenGetter = () => null;

export class ApiClientError extends Error {
  status: number | null;
  method: string | null;
  url: string | null;
  code: string | null;

  constructor(
    message: string,
    status: number | null,
    method: string | null,
    url: string | null,
    code: string | null
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.method = method;
    this.url = url;
    this.code = code;
  }
}

export function setAccessTokenGetter(getter: AccessTokenGetter) {
  accessTokenGetter = getter;
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60_000,
});

apiClient.interceptors.request.use((config) => {
  const token = accessTokenGetter();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const message = typeof error.response?.data === 'string'
      ? error.response.data
      : error.message;
    const method = error.config?.method?.toUpperCase() ?? null;
    const path = error.config?.url ?? null;
    const url = path ? `${getApiBaseUrl()}${path}` : null;
    const code = error.code ?? null;
    return Promise.reject(
      new ApiClientError(
        `API_ERROR${status ? `_${status}` : ''}: ${message}`,
        status ?? null,
        method,
        url,
        code
      )
    );
  }
);

export async function postFormData(path: string, formData: FormData) {
  const response = await apiClient.post(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data ?? {};
}
