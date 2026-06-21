import axios, { AxiosInstance } from 'axios';
import { getToken, clearSession } from '@store/helpers';

const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Producción: Cloud Run o dominio personalizado
    // URL debe venir de NEXT_PUBLIC_API_URL; no hardcodear en código
    if (hostname.includes('run.app') || hostname.includes('iris-frontend') || hostname.includes('prizma.cloud')) {
      console.warn('Warning: NEXT_PUBLIC_API_URL not set. Using localhost fallback.');
      return 'http://localhost:3001/api';
    }
  }

  return 'http://localhost:3001/api';
};

const service: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

service.interceptors.request.use(
  config => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

const isDevApp =
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' ||
  process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true' ||
  process.env.NODE_ENV !== 'production';

const logged401 = new Map<string, boolean>();

service.interceptors.response.use(
  response => response,
  async error => {
    if (isDevApp && error.response) {
      const key = `${error.response.status}:${error.config?.url}`;
      if (!logged401.get(key)) {
        console.log('🔧 DEV MODE:', error.response.status, error.config?.url);
        logged401.set(key, true);
      }
    }

    const originalRequest = error.config;

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (isDevApp) {
        console.log('🔧 DEV MODE: Token inválido - redirigiendo a login');
      }

      clearSession();
      return Promise.reject(error);
    }

    if (
      originalRequest._retry &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      clearSession();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default service;
