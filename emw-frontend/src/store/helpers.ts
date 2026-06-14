import { store } from './index';
import { RootState } from './rootReducer';
import { auth } from '@utils/firebase.config';
import userActions from '../store/user/actions';
import router from 'next/router';

export const getToken = (): string | undefined => {
  const state: RootState = store.getState();
  if (state.user.token) {
    return state.user.token;
  }

  if (typeof window !== 'undefined') {
    const localToken = localStorage.getItem('token');
    if (localToken) {
      return localToken;
    }
  }

  return undefined;
};

export const renewToken = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (user) {
      const newToken = await user.getIdToken(true);
      userActions.setToken(store.dispatch, newToken);
      window.location.reload();
    }
  } catch (error) {
    console.error('Error al renovar el token:', error);
    clearSession();
    throw error;
  }
};

export const clearSession = () => {
  userActions.clearUser(store.dispatch);
  router.push('/login');
};
