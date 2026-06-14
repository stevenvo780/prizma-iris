import axios from '@utils/axios';
import { AxiosResponse } from 'axios';
import { Templates } from '@utils/types';

export const getTemplatesAPI = (): Promise<AxiosResponse<Templates[]>> => {
  return axios.get('/templates');
};

export const createTemplateAPI = (template: Templates): Promise<AxiosResponse<Templates>> => {
  return axios.post('/templates', template);
};

export const updateTemplateAPI = (
  id: string,
  template: {
    active: boolean;
  },
): Promise<AxiosResponse<Templates>> => {
  return axios.patch(`/templates/${id}`, template);
};

export const deleteTemplateAPI = (id: string): Promise<AxiosResponse<void>> => {
  return axios.delete(`/templates/${id}`);
};

export const submitTemplateForApprovalAPI = (id: string): Promise<AxiosResponse<Templates>> => {
  return axios.post(`/templates/${id}/submit`);
};

export const sendTemplateToCustomersAPI = (data: {
  templateId: string;
  tags: string[];
  parameters?: any[];
}): Promise<AxiosResponse<any>> => {
  return axios.post('/templates/send-bulk', data);
};

export const syncTemplateStatusAPI = (id: string): Promise<AxiosResponse<Templates>> => {
  return axios.post(`/templates/${id}/sync-whatsapp-status`);
};

export const syncAllTemplatesStatusAPI = (): Promise<AxiosResponse<{
  syncedCount: number;
  updatedCount: number;
  errors: string[];
}>> => {
  return axios.post('/templates/sync-all-whatsapp-status');
};
