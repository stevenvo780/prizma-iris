import axios from '@utils/axios';

export interface SendChatMessageDto {
  phoneNumber: string;
  content: string;
  type?: 'text' | 'image' | 'document' | 'audio' | 'video';
  mediaUrl?: string;
  mediaCaption?: string;
}

export const sendChatMessage = (dto: SendChatMessageDto) => {
  return axios.post('/chat/send', dto);
};

export const getChatConversations = () => {
  return axios.get('/chat/conversations');
};

export const getChatMessages = (phoneNumber: string, limit = 50) => {
  return axios.get(`/chat/messages/${phoneNumber}?limit=${limit}`);
};

export const markChatRead = (phoneNumber: string) => {
  return axios.post(`/chat/read/${phoneNumber}`);
};
