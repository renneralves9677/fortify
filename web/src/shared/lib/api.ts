import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
  withCredentials: true,
});

const AUTH_SKIP_REFRESH = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/signup',
  '/auth/signup/verify',
  '/auth/signup/resend',
  '/auth/forgot-password',
  '/auth/reset/verify-code',
  '/auth/reset-password',
];

function shouldSkipRefresh(url?: string): boolean {
  if (!url) return false;
  return AUTH_SKIP_REFRESH.some((path) => url.includes(path));
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { data } = await api.post<{ token: string }>('/auth/refresh');
  useAuthStore.getState().setToken(data.token);
  return data.token;
}

function redirectToLogin() {
  const path = window.location.pathname;
  if (!path.startsWith('/login') && !path.startsWith('/criar-conta')) {
    window.location.href = '/login';
  }
}

api.interceptors.request.use((config) => {
  const { token, companyId } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (companyId) config.headers['X-Company-Id'] = companyId;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const status = err.response?.status;
    const code = (err.response?.data as { code?: string } | undefined)?.code;
    const original = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (status === 403 && code === 'CONSENT_REQUIRED') {
      return Promise.reject(err);
    }

    if (status === 401 && original && !original._retry && !shouldSkipRefresh(original.url)) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        useAuthStore.getState().logout();
        redirectToLogin();
        return Promise.reject(refreshErr);
      }
    }

    if (status === 401 && !shouldSkipRefresh(original?.url)) {
      useAuthStore.getState().logout();
      redirectToLogin();
    }

    return Promise.reject(err);
  },
);
