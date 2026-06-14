import axios from '@utils/axios';
import { AxiosResponse } from 'axios';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  };
  token: string;
}

export const login = (credentials: LoginRequest): Promise<AxiosResponse<LoginResponse>> => {
  return axios.post('/auth/login', credentials);
};
