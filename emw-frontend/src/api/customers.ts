import axios from '@utils/axios';
import { AxiosResponse } from 'axios';
import { Customer } from '@utils/types';

export const getCustomersAPI = (
  page: number = 1,
  limit: number = 50,
  search: string = '',
): Promise<AxiosResponse<any>> => {
  const params = new URLSearchParams();
  if (page > 0) params.append('page', String(page));
  if (limit > 0) params.append('limit', String(limit));
  if (search) params.append('search', search);
  return axios.get(`/customers?${params.toString()}`);
};

export const createCustomerAPI = (customer: Customer): Promise<AxiosResponse<Customer>> => {
  return axios.post('/customers', customer);
};

export const updateCustomerAPI = (
  id: number,
  customer: Customer,
): Promise<AxiosResponse<Customer>> => {
  return axios.patch(`/customers/${id}`, customer);
};

export const deleteCustomerAPI = (id: number): Promise<AxiosResponse<void>> => {
  return axios.delete(`/customers/${id}`);
};

export const getLabelsAPI = (): Promise<AxiosResponse<string[]>> => {
  return axios.get('/customers/tags');
};

export const uploadCustomersAPI = (data: { customers: any[] }): Promise<AxiosResponse<any>> => {
  return axios.post('/customers/import', data);
};
