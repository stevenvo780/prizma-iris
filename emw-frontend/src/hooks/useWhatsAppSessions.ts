import { useState, useEffect } from 'react';
import { database } from '@utils/firebase.config';
import { WhatsAppSession } from '@utils/types';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';

export const useWhatsAppSessions = () => {
  const [sessions, setSessions] = useState<Record<string, WhatsAppSession>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = useSelector((state: RootState) => state.user.user?.id);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const sessionsRef = database.ref(`whatsapp_sessions/${userId}`);

    sessionsRef.on(
      'value',
      (snapshot: any) => {
        const data = snapshot.val();
        setSessions(data || {});
        setLoading(false);
      },
      (err: any) => {
        console.error('Error al leer las sesiones de WhatsApp:', err);
        setError('Error al cargar las sesiones de WhatsApp');
        setLoading(false);
      },
    );

    return () => {
      sessionsRef.off();
    };
  }, [userId]);

  return { sessions, loading, error };
};

export default useWhatsAppSessions;
