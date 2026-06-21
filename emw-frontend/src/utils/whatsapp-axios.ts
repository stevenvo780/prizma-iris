import axios, { AxiosInstance } from 'axios';
import { getToken } from '@store/helpers';

const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace('/api', '');
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('run.app')) {
    return 'https://prizma-iris-kjopuery2a-uc.a.run.app';
  }
  return 'http://localhost:3001';
};

const whatsappService: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

whatsappService.interceptors.request.use(
  config => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.user_id || payload.uid || payload.sub;
        if (userId) {
          config.headers['x-user-id'] = userId;
        }
      } catch (error) {
        console.warn('No se pudo extraer userId del token:', error);

        config.headers['x-user-id'] = 'kcdAXbL89EfH753e5rO0llRoxLk1';
      }
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

whatsappService.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    return Promise.reject(error);
  },
);

export default whatsappService;
