import { useState, useEffect } from 'react';
import { getWppAccounts } from '@/api/whatsapp';
import service from '@/utils/axios';
import useUser from '@/store/user';

interface WppAccount {
  id: string;
  name: string;
  phoneNumberId: string;
  accessToken: string;
  wabaId: string;
  isActive?: boolean;
}

export const useActiveWhatsappAccount = () => {
  const { user } = useUser();
  const [activeAccount, setActiveAccount] = useState<WppAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkActiveAccount = async () => {
      const activeId = (user as any)?.activeWhatsappAccountId;

      try {
        const activeAccountRes = await service.get('/accounts/active');
        const backendActiveAccount = activeAccountRes.data;

        if (backendActiveAccount) {
          setActiveAccount(backendActiveAccount);
          setError(null);

          if (activeId && activeId !== backendActiveAccount.id) {

            setError(
              `Desincronización: Usuario apunta a ${activeId} pero backend tiene ${backendActiveAccount.id} activa`,
            );
          }
        } else {
          if (activeId) {
            const res = await getWppAccounts();
            const accounts = res.data;
            const account = accounts.find((acc: WppAccount) => acc.id === activeId);

            if (account) {
              setActiveAccount(account);
              setError('Cuenta encontrada pero no está marcada como activa en el backend');
            } else {
              setActiveAccount(null);
              setError('La cuenta seleccionada no existe');
            }
          } else {
            setActiveAccount(null);
            setError(null);
          }
        }
      } catch (err: any) {
        console.error('❌ Error obteniendo cuenta activa:', err);

        try {
          const res = await getWppAccounts();
          const accounts = res.data;
          const activeAccount = accounts.find((acc: WppAccount) => acc.isActive === true);

          if (activeAccount) {
            setActiveAccount(activeAccount);
            setError(null);
          } else {
            setActiveAccount(null);
            setError('Error al verificar cuenta de WhatsApp');
          }
        } catch (fallbackErr: any) {
          console.error('❌ Error en fallback:', fallbackErr);
          setActiveAccount(null);
          setError('Error al obtener cuentas de WhatsApp');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkActiveAccount();
    } else {
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    activeAccount,
    loading,
    error,
    hasActiveAccount: !!activeAccount,
  };
};
