import axios from '@utils/axios';
import { AxiosResponse } from 'axios';
import { AutoReplyConfig, MessageLogsResponse } from '@utils/types';

export const getAutoReplyConfigAPI = (): Promise<AxiosResponse<AutoReplyConfig>> => {
  return axios.get(`/robot/auto-reply`);
};

export const updateAutoReplyConfigAPI = (
  config: AutoReplyConfig,
): Promise<AxiosResponse<AutoReplyConfig>> => {
  return axios.put(`/robot/auto-reply`, config);
};

export const getMessageLogsAPI = (
  limit: number = 50,
  offset: number = 0,
): Promise<AxiosResponse<MessageLogsResponse>> => {
  return axios.get(`/wppMS/logs`, {
    params: { limit, offset },
  });
};
