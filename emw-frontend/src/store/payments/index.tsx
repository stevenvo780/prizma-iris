import { useDispatch, useSelector } from 'react-redux';
import axios from '@utils/axios';
import { RootState } from '../rootReducer';
import paymentActions from './actions';
import { PaymentDetails, User, ValidationResponse } from '@utils/types';
import { useRouter } from 'next/router';
import useUI from '@store/ui';
import useUser from '@store/user';

const usePayments = () => {
  const { paymentDetails, validationResponse } = useSelector((state: RootState) => state.payments);
  const dispatch = useDispatch();
  const { setLoading, addAlert } = useUI();
  const { setUser, logout } = useUser();
  const router = useRouter();

  const createPreference = async (planType: string, periodicity: string = 'monthly') => {
    setLoading(true);
    try {
      const response = await axios.post('/payments/create-preference', {
        planType,
        periodicity,
      });
      return response.data;
    } catch (error: any) {
      console.error(error);
      if (error?.response?.data?.message) {
        addAlert({ type: 'danger', message: error.response.data.message });
      } else {
        addAlert({ type: 'danger', message: 'Error al crear la preferencia de pago.' });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getPaymentHistory = async () => {
    try {
      const response = await axios.get('/payments/history');
      return response.data;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  };

  const getUsageLimits = async () => {
    try {
      const response = await axios.get('/payments/limits');
      return response.data;
    } catch (error) {
      console.error('Error fetching usage limits:', error);
      return null;
    }
  };

  const payUsers = async (details: PaymentDetails) => {
    setLoading(true);
    try {
      const response = await axios.post<PaymentDetails>('/payments/pay', details);
      paymentActions.setPaymentDetails(dispatch, response.data);
      addAlert({ type: 'success', message: 'Pago creado con éxito.' });
      setUser(response.data);
    } catch (error: any) {
      console.error(error);
      if (error?.response?.data?.message) {
        addAlert({ type: 'danger', message: error.response.data.message });
      } else {
        addAlert({ type: 'danger', message: 'Error al crear el pago.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const validatePay = async () => {
    setLoading(true);
    try {
      const response = await axios.post<ValidationResponse>('/payments/validate');
      paymentActions.setValidationResponse(dispatch, response.data);
      addAlert({ type: 'success', message: 'Validación de pago exitosa.' });
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({ type: 'danger', message: 'Ocurrió un error, consulta a soporte' });
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/payments/cancel');
      const result = response.data;
      if (result.subscriptionExpiresAt) {
        addAlert({
          type: 'success',
          message: result.message || 'Suscripción cancelada. Tu plan seguirá activo hasta la fecha de expiración.',
        });
      } else {
        setUser(result);
        addAlert({ type: 'success', message: 'Suscripción cancelada con éxito.' });
      }
      return result;
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({ type: 'danger', message: 'Error al cancelar la suscripción.' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionStatus = async () => {
    try {
      const response = await axios.get('/payments/subscription/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      return null;
    }
  };

  const getToken = async () => {
    // Legacy - ya no se usa con Mercado Pago
    return 'mp_token';
  };

  return {
    paymentDetails,
    validationResponse,
    payUsers,
    validatePay,
    cancelSubscription,
    getToken,
    createPreference,
    getPaymentHistory,
    getUsageLimits,
    getSubscriptionStatus,
  };
};

export default usePayments;
