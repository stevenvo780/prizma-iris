import axios from '@utils/axios';
import whatsappService from '@utils/whatsapp-axios';
import { AxiosResponse } from 'axios';
import { WppMS } from '@utils/types';

export const getMessagesAPI = (): Promise<AxiosResponse<WppMS[]>> => {
  return axios.get('/messages').then(response => {
    const adaptedMessages = response.data.map((template: any) => ({
      id: template.id,
      content: template.content || '',
      mediaAttachments: template.mediaAttachments || null,
      mediaType: null,
      messageType: 'text',
      active: template.active,
      order: template.order || 1,
      labels: [],
      messageParameters: null,
    }));

    return { ...response, data: adaptedMessages };
  });
};

export const createMessageAPI = (message: WppMS): Promise<AxiosResponse<WppMS>> => {
  const sendMessageDto = {
    name: 'nombre de prueba',
    content: message.message || message.content,
    mediaAttachments: message.mediaType,
    active: true,
    order: message.order || 0,
  };
  return axios.post('/messages', sendMessageDto);
};

export const sendMessageAPI = (data: {
  type?: string;
  recipientNumber?: string;
  recipientNumbers?: string[];
  content?: string;
  templateId?: string;
  templateParams?: any[];
  mediaAttachments?: any[];
  priority?: number;
  scheduledAt?: Date;
}): Promise<AxiosResponse<any>> => {

  if (data.recipientNumber === 'draft') {
    const sendMessageDto = {
      name: `mensaje-${Date.now()}`,
      content: data.content,
      mediaAttachments: data.mediaAttachments || undefined,
      active: true,
      order: 0,
    };
    return axios.post('/messages', sendMessageDto);
  }

  return axios.post('/messages/bulk-send', data);
};

export const updateMessageAPI = (
  id: number | string,
  message: {
    active?: boolean;
    content?: string;
    mediaAttachments?: any[] | string | null;
    mediaType?: string | null;
    order?: number;
  },
): Promise<AxiosResponse<WppMS>> => {
  return axios.put(`/messages/${id}`, message).then(response => {
    const t = response.data;
    const adapted: WppMS = {
      id: t.id,
      content: t.content || t.message || '',
      mediaAttachments: t.mediaAttachments || t.file || null,
      mediaType: t.mediaType || null,
      messageType: t.messageType || 'text',
      active: t.active,
      order: t.order || 1,
      labels: [],
      messageParameters: null,
    };
    return { ...response, data: adapted };
  });
};

export const deleteMessageAPI = (id: number): Promise<AxiosResponse<void>> => {
  return axios.delete(`/messages/${id}`);
};

export const reorderMessagesAPI = (
  items: { id: string; order: number }[],
): Promise<AxiosResponse<{ success: boolean; updated: number }>> => {
  return axios.put('/messages/batch/reorder', { items });
};

export const getLabelsAPI = (): Promise<AxiosResponse<string[]>> => {
  return axios.get('/customers/tags');
};

export const scheduleMessagesAPI = (labels: string[]): Promise<AxiosResponse<void>> => {
  return axios.post('/customers/scheduler', { labels: labels });
};

export const sendBulkMessagesAPI = (data: {
  type?: string;
  recipientNumbers?: string[];
  customerTags?: string[];
  content?: string;
  templateId?: string;
  templateParams?: any[];
  mediaAttachments?: any[];
  priority?: number;
  scheduledAt?: Date;
}): Promise<AxiosResponse<any>> => {
  return axios.post('/messages/bulk-send', data);
};

export const createWhatsAppTemplateAPI = (templateData: any): Promise<AxiosResponse<any>> => {
  return whatsappService.post('/whatsapp/templates', templateData);
};

export const convertToTemplateAPI = (templateText: string): Promise<AxiosResponse<any>> => {
  return axios.post('/messages/convert', { templateText });
};

export const previewTemplateAPI = (templateText: string): Promise<AxiosResponse<any>> => {
  return axios.post('/messages/preview', { templateText });
};

export const deleteWhatsAppTemplateAPI = (
  templateName: string,
  accountId?: string,
): Promise<AxiosResponse<any>> => {
  return whatsappService.delete(`/whatsapp/templates/${accountId}/${templateName}`);
};

export const getMessageStatsAPI = (params: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<AxiosResponse<any>> => {
  return axios.get('/messages/stats', { params });
};

export const getMessageLogsAPI = (params: {
  status?: string;
  direction?: string;
  recipientNumber?: string;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AxiosResponse<{
  logs: any[];
  total: number;
  page: number;
  totalPages: number;
  customerMap: Record<string, { name: string; tags: { name: string; color: string }[] }>;
}>> => {
  return axios.get('/messages/logs', { params });
};

export const uploadMediaAPI = (file: File): Promise<AxiosResponse<{ url: string }>> => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post('/messages/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
