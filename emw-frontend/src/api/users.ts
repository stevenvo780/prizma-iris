import axios from '@utils/axios';
import { AxiosResponse } from 'axios';
import { User } from '@utils/types';

export const getUser = (): Promise<AxiosResponse<User>> => {
  return axios.get('/auth/profile');
};

export const updateUserProfile = (userData: any): Promise<AxiosResponse<any>> => {
  return axios.patch(`/auth/profile`, userData);
};

export const register = (userData: any): Promise<AxiosResponse<any>> => {
  return axios.post('/auth/register', userData);
};

export const setActiveWhatsappAccount = (data: { whatsappAccountId: string }) => {
  return axios.post(`/accounts/${data.whatsappAccountId}/set-active`);
};
