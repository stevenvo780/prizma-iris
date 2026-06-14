import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../rootReducer';
import {
  auth,
  compatAuth,
  providers,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from '@utils/firebase.config';
import { useRouter } from 'next/router';
import userActions from './actions';
import api from '../../api';
import useUI from '@store/ui';
import firebase from 'firebase/compat/app';
import { UserRoleOptions } from '@utils/types';

const useUser = () => {
  const { token, user } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();
  const router = useRouter();
  const { setLoading, addAlert } = useUI();

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await compatAuth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      if (user) {
        const token = await user.getIdToken();
        userActions.setToken(dispatch, token);
        router.push('/messages');
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      addAlert({ type: 'danger', message: 'Error en contraseña o correo' });
    } finally {
      setLoading(false);
    }
  };

  const loginWithProvider = async (providerName: keyof typeof providers) => {
    setLoading(true);
    try {
      const provider = providers[providerName];
      const result = await compatAuth.signInWithPopup(provider);
      const user = result.user;
      if (user) {
        const token = await user.getIdToken();
        userActions.setToken(dispatch, token);
        router.push('/messages');
      }
    } catch (error) {
      console.error(`Error al iniciar sesión con ${providerName}:`, error);
      addAlert({ type: 'danger', message: `Error al iniciar sesión con ${providerName}` });
    } finally {
      setLoading(false);
    }
  };

  const loginWithBackend = async (
    email: string,
    password: string,
    opts?: { silent?: boolean },
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await api.auth.login({ email, password });
      const { token, user: backendUser } = response.data;

      const user = {
        ...backendUser,
        password: '',
        name: `${backendUser.firstName || ''} ${backendUser.lastName || ''}`.trim(),
        phone: '',
        role: backendUser.role as UserRoleOptions,
        confirmEmail: true,
        robotStatus: {
          id: 1,
          isEnabled: false,
          user: {} as any,
        },
      };

      userActions.setToken(dispatch, token);
      userActions.setUser(dispatch, user);
      router.push('/customers');
      return true;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      if (!opts?.silent) {
        addAlert({ type: 'danger', message: 'Error en contraseña o correo' });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const autoLoginForDev = async () => {
    if (process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN !== 'true') {
      return;
    }
    console.log('🔧 Auto-login temporal para desarrollo');

    const logged = await loginWithBackend('admin@test.emw', 'admin123', { silent: true });
    if (logged) {
      console.log('✅ Auto-login exitoso para desarrollo');
      return;
    }

    console.warn('⚠️ Auto-login falló, intentando registro automático en dev...');

    await registerUser(
      {
        email: 'admin@test.emw',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'EMW',
      },
      { silent: true },
    );
    const loggedAfterRegister = await loginWithBackend('admin@test.emw', 'admin123', {
      silent: true,
    });
    if (loggedAfterRegister) {
      console.log('✅ Auto-login exitoso tras registro');
      return;
    }

    const ts = Date.now();
    const tempEmail = `dev_${ts}@test.emw`;
    console.warn(`🧪 Creando usuario temporal: ${tempEmail}`);
    const tempRegistered = await registerUser(
      {
        email: tempEmail,
        password: 'admin123',
        firstName: 'Dev',
        lastName: 'Temp',
      },
      { silent: true },
    );
    if (tempRegistered) {
      await loginWithBackend(tempEmail, 'admin123', { silent: true });
      console.log('✅ Usuario temporal creado y autenticado');
    } else {
      console.error('❌ No se pudo crear usuario temporal para auto-login');
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      await compatAuth.sendPasswordResetEmail(email);
      addAlert({ type: 'success', message: 'Correo de recuperación enviado' });
    } catch (error) {
      console.error('Error al enviar el correo de recuperación:', error);
      addAlert({ type: 'danger', message: 'Error al enviar el correo de recuperación' });
    } finally {
      setLoading(false);
    }
  };

  const reauthenticate = async (currentPassword: string) => {
    const user = auth.currentUser;
    if (user && user.email) {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      try {
        await reauthenticateWithCredential(user, credential);
        return true;
      } catch (error) {
        console.error('Error al reautenticar:', error);
        addAlert({
          type: 'danger',
          message: 'Error al reautenticar. Por favor verifica tu contraseña actual.',
        });
        return false;
      }
    }
    return false;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const reauthenticated = await reauthenticate(currentPassword);
        if (reauthenticated) {
          await updatePassword(user, newPassword);
          addAlert({ type: 'success', message: 'Contraseña actualizada exitosamente' });
        }
      }
    } catch (error) {
      console.error('Error al cambiar la contraseña:', error);
      addAlert({ type: 'danger', message: 'Error al cambiar la contraseña' });
    } finally {
      setLoading(false);
    }
  };

  const renewToken = useCallback(async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const newToken = await user.getIdToken(true);
        userActions.setToken(dispatch, newToken);
      }
    } catch (error) {
      console.error('Error al renovar el token:', error);
      addAlert({ type: 'danger', message: 'Sesión expirada, por favor inicia sesión nuevamente' });
      userActions.clearUser(dispatch);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [setLoading, addAlert, dispatch, router]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const response = await api.users.getUser();
      const backendUser = response.data;
      const userData = {
        ...backendUser,
        name: `${backendUser.firstName || ''} ${backendUser.lastName || ''}`.trim(),
      };
      userActions.setUser(dispatch, userData);
    } catch (error) {
      console.error('Error fetching user:', error);
      addAlert({ type: 'danger', message: 'Error al obtener la información del usuario' });
    } finally {
      setLoading(false);
    }
  };

  const setUser = (userData: any) => {
    userActions.setUser(dispatch, userData);
  };

  const updateUserProfile = async (profileData: any) => {
    setLoading(true);
    try {
      await api.users.updateUserProfile(profileData);
      addAlert({ type: 'success', message: 'Perfil actualizado exitosamente' });
      fetchUser();
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      addAlert({ type: 'danger', message: 'Error al actualizar el perfil' });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    dispatch(userActions.resetStore());
    // Limpiar Redux Persist del localStorage para evitar sesiones persistentes
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('persist:root');
      } catch (e) {
        console.warn('Error limpiando localStorage:', e);
      }
      window.location.reload();
    }
  };

  const registerUser = async (
    userData: any,
    opts?: { silent?: boolean },
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await api.users.register(userData);
      if (response.data.user && response.data.token) {
        const { token, user: backendUser } = response.data;

        const user = {
          ...backendUser,
          password: '',
          name: `${backendUser.firstName || ''} ${backendUser.lastName || ''}`.trim(),
          phone: '',
          role: backendUser.role,
          confirmEmail: true,
          robotStatus: {
            id: 1,
            isEnabled: false,
            user: {} as any,
          },
        };

        userActions.setToken(dispatch, token);
        userActions.setUser(dispatch, user);
        if (!opts?.silent) {
          addAlert({ type: 'success', message: 'Registro exitoso' });
        }
        router.push('/customers');
        return true;
      } else {
        if (!opts?.silent) {
          addAlert({ type: 'danger', message: response.data.message || 'Error en el registro' });
        }
        return false;
      }
    } catch (error: any) {
      console.error('Ocurrió un error al registrar:', error);
      const errorMessage =
        error.response?.data?.message || error.message || 'Error al registrar';
      if (!opts?.silent) {
        addAlert({ type: 'danger', message: errorMessage });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const setActiveWhatsappAccount = async (whatsappAccountId: string) => {
    setLoading(true);
    try {
      await api.users.setActiveWhatsappAccount({ whatsappAccountId });
      addAlert({ type: 'success', message: 'Cuenta de WhatsApp activa actualizada' });
      fetchUser();
    } catch (error) {
      console.error('Error al actualizar la cuenta activa:', error);
      addAlert({ type: 'danger', message: 'Error al actualizar la cuenta activa de WhatsApp' });
    } finally {
      setLoading(false);
    }
  };

  const getActiveWhatsappAccount = () => {
    const activeId = (user as any)?.activeWhatsappAccountId || null;
    return activeId;
  };

  const isAuthenticated = () => !!token;

  return {
    token,
    user,
    loginWithEmail,
    loginWithProvider,
    loginWithBackend,
    autoLoginForDev,
    resetPassword,
    changePassword,
    renewToken,
    fetchUser,
    updateUserProfile,
    logout,
    isAuthenticated,
    registerUser,
    reauthenticate,
    setUser,
    setActiveWhatsappAccount,
    getActiveWhatsappAccount,
  };
};

export default useUser;
