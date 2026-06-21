import { ChangeEvent } from 'react';
import { WppMS } from '@utils/types';
import messageActions from './actions';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../rootReducer';
import api from '../../api';
import useUI from '../ui';
import useUser from '../user';
import { handleError } from '@utils/errorHandler';

const useMessages = () => {
  const { messages, labels } = useSelector((state: RootState) => state.messages);
  const dispatch = useDispatch();
  const { setLoading, addAlert } = useUI();
  const { getActiveWhatsappAccount } = useUser();

  const fetchMessages = async (params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => {
    setLoading(true);
    try {
      const response = await api.messages.getMessagesAPI(params);

      if (!response.data) {
        throw new Error('No se recibieron datos del servidor');
      }

      const messages = Array.isArray(response.data) ? response.data : [];
      if (messages.length === 0) {
        console.warn('No se encontraron mensajes');
        // No lanzar error, solo retornar array vacío
      }

      messageActions.setMessages(dispatch, messages);
      return { success: true, data: messages };
    } catch (error: any) {
      const parsedError = handleError(error, 'Obtener mensajes');
      addAlert({ type: 'danger', message: parsedError.userMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createMessage = async (message: WppMS) => {
    setLoading(true);
    try {
      const id = (message as any).id || Date.now().toString();
      const newMessage: WppMS = { ...message, id } as any;
      messageActions.addMessage(dispatch, newMessage);
      addAlert({ type: 'success', message: 'Mensaje creado con éxito' });
      return newMessage;
    } catch (error: any) {
      const parsedError = handleError(error, 'Crear mensaje');
      addAlert({ type: 'danger', message: parsedError.userMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (data: {
    recipientNumber?: string;
    recipientNumbers?: string[];
    content?: string;
    templateId?: string;
    templateParams?: any[];
    mediaAttachments?: any[];
    priority?: number;
    scheduledAt?: Date;
  }) => {
    setLoading(true);
    try {
      const response = await api.messages.sendMessageAPI({
        ...data,
        type: data.templateId ? 'template' : 'text'
      });
      addAlert({ type: 'success', message: 'Mensaje enviado con éxito' });
      return response.data;
    } catch (error: any) {
      const parsedError = handleError(error, 'Enviar mensaje');
      addAlert({ type: 'danger', message: parsedError.userMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateMessage = async (id: string, updateData: any) => {
    setLoading(true);
    try {
      const response = await api.messages.updateMessageAPI(id, updateData);
      messageActions.updateMessage(dispatch, response.data);
      addAlert({ type: 'success', message: 'Mensaje actualizado con éxito' });
    } catch (error: any) {
      const parsedError = handleError(error, 'Actualizar mensaje');
      addAlert({ type: 'danger', message: parsedError.userMessage });
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (id: string) => {
    setLoading(true);
    try {
      await api.messages.deleteMessageAPI(id);
      messageActions.deleteMessage(dispatch, id);
      addAlert({ type: 'success', message: 'Mensaje eliminado con éxito' });
    } catch (error: any) {
      const parsedError = handleError(error, 'Eliminar mensaje');
      addAlert({ type: 'danger', message: parsedError.userMessage });
    } finally {
      setLoading(false);
    }
  };

  const retryMessage = async (id: string) => {
    setLoading(true);
    try {
      const response = await api.messages.retryMessageAPI(id);
      addAlert({ type: 'success', message: 'Mensaje reenviado' });
      return response.data;
    } catch (error: any) {
      const parsedError = handleError(error, 'Reenviar mensaje');
      addAlert({ type: 'danger', message: parsedError.userMessage });
    } finally {
      setLoading(false);
    }
  };

  const cancelMessage = async (id: string) => {
    setLoading(true);
    try {
      const response = await api.messages.cancelMessageAPI(id);
      addAlert({ type: 'success', message: 'Mensaje cancelado' });
      return response.data;
    } catch (error: any) {
      const parsedError = handleError(error, 'Cancelar mensaje');
      addAlert({ type: 'danger', message: parsedError.userMessage });
    } finally {
      setLoading(false);
    }
  };

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const response = await api.messages.getLabelsAPI();
      const labels = response.data.map((label: string) => ({ value: label, label }));
      messageActions.setLabels(dispatch, labels);
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({ type: 'danger', message: 'Ocurrió un error, consulta a soporte' });
    } finally {
      setLoading(false);
    }
  };

  const sendBulkMessages = async (data: {
    customerTags?: string[];
    recipientNumbers?: string[];
    content?: string;
    templateId?: string;
    templateParams?: any[];
    mediaAttachments?: any[];
    priority?: number;
    scheduledAt?: Date;
  }) => {
    setLoading(true);
    try {
      const bulkData = {
        ...data,
        type: data.templateId ? 'template' : 'text'
      };

      const response = await api.messages.sendBulkMessagesAPI(bulkData);

      const totalMessages = response.data?.totalMessages || response.data?.length || 0;
      const failedCount = response.data?.failed || 0;

      if (totalMessages > 0) {
        addAlert({
          type: 'success',
          message: `Envío masivo iniciado: ${totalMessages} mensajes programados`
        });
      } else {
        addAlert({
          type: 'warning',
          message: 'No se encontraron destinatarios válidos'
        });
      }

      return response.data;
    } catch (error: any) {
      const parsedError = handleError(error, 'Envío masivo de mensajes');
      addAlert({ type: 'danger', message: parsedError.userMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const scheduleMessages = async (labelList: string[]) => {
    setLoading(true);
    try {
      const response = await api.messages.scheduleMessagesAPI(labelList);
      addAlert({ type: 'success', message: 'Mensajes programados con éxito' });
      return response.data;
    } catch (error: any) {
      const parsedError = handleError(error, 'Programar mensajes');
      addAlert({ type: 'danger', message: parsedError.userMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getMessageStats = async (params?: {
    dateFrom?: string;
    dateTo?: string;
  }) => {
    try {
      const response = await api.messages.getMessageStatsAPI(params);
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return null;
    }
  };

  const uploadImage = async (image: File): Promise<string> => {
    try {
      const response = await api.messages.uploadMediaAPI(image);
      return response.data.url;
    } catch (error) {
      console.error('Error uploading to backend:', error);
      // Fallback: convertir a base64 data URL
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = () => {
          addAlert({ type: 'danger', message: 'Error al subir la imagen.' });
          reject(new Error('Error reading file'));
        };
        reader.readAsDataURL(image);
      });
    }
  };

  return {
    messages,
    labels,
    fetchMessages,
    createMessage,
    sendMessage,
    updateMessage,
    deleteMessage,
    retryMessage,
    cancelMessage,
    fetchLabels,
    scheduleMessages,
    sendBulkMessages,
    getMessageStats,
    uploadImage,
  };
};

export default useMessages;
