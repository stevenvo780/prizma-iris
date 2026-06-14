import axios from '@utils/axios';
import { AxiosResponse } from 'axios';

export interface OptInStatus {
  phoneNumber: string;
  hasOptIn: boolean;
  timestamp: string | null;
  source: string | null;
}

export interface OptInRequest {
  hasOptIn: boolean;
  source?: string;
}

export const getOptInStatus = (phoneNumber: string): Promise<AxiosResponse<OptInStatus>> => {
  return axios.get(`/opt-in/${phoneNumber}`);
};

export const setOptInStatus = (
  phoneNumber: string,
  data: OptInRequest,
): Promise<
  AxiosResponse<{
    message: string;
    phoneNumber: string;
    hasOptIn: boolean;
    timestamp: string;
  }>
> => {
  return axios.post(`/opt-in/${phoneNumber}`, data);
};

export const forceOptInForTesting = (
  phoneNumber: string,
): Promise<
  AxiosResponse<{
    message: string;
    phoneNumber: string;
    hasOptIn: boolean;
    timestamp: string;
  }>
> => {
  return setOptInStatus(phoneNumber, {
    hasOptIn: true,
    source: 'manual_testing',
  });
};
