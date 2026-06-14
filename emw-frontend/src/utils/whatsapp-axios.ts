import axios, { AxiosInstance } from 'axios';
import { getToken } from '@store/helpers';

const whatsappService: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_WPP_API || 'http://localhost:3000',
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
