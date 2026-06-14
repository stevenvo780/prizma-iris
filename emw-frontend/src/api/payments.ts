import axios from '@utils/axios';
import { AxiosResponse } from 'axios';
import { PaymentDetails, User, ValidationResponse } from '@utils/types';

export const payUsersAPI = (details: PaymentDetails): Promise<AxiosResponse<PaymentDetails>> => {
  return axios.post('/payUsers', details);
};

export const validatePayAPI = (): Promise<AxiosResponse<ValidationResponse>> => {
  return axios.post('/validatePay');
};

export const cancelSubscriptionAPI = (): Promise<AxiosResponse<User>> => {
  return axios.get('/cancelSubscription');
};
