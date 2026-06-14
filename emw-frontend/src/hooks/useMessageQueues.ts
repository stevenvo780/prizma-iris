import { useState, useEffect } from 'react';
import { database } from '@utils/firebase.config';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';

export interface MessageQueue {
  isEnabled: boolean;
  remainingMessages?: number;
  robotStatus?: boolean;
  updatedAt: number;
  userId?: string;
}

export const useMessageQueues = () => {
  const [messageQueue, setMessageQueue] = useState<MessageQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = useSelector((state: RootState) => state.user.user?.id);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const queueRef = database.ref(`messageQueues/${userId}`);

    queueRef.on(
      'value',
      (snapshot: any) => {
        const data = snapshot.val();
        setMessageQueue(data || null);
        setLoading(false);
      },
      (err: any) => {
        console.error('Error al leer la cola de mensajes:', err);
        setError('Error al cargar la información de la cola de mensajes');
        setLoading(false);
      },
    );

    return () => {
      queueRef.off();
    };
  }, [userId]);

  return {
    messageQueue,
    remainingMessages: messageQueue?.remainingMessages || 0,
    isEnabled: messageQueue?.isEnabled || false,
    robotStatus: messageQueue?.robotStatus || false,
    loading,
    error,
  };
};

export default useMessageQueues;
