import { Dispatch } from 'react';
import { User } from '@utils/types';

const actions = {
  setToken: (dispatch: Dispatch<any>, token: string) => {
    dispatch({ type: 'SET_TOKEN', payload: { token } });
  },

  setUser: (dispatch: Dispatch<any>, user: User) => {
    dispatch({ type: 'SET_USER', payload: { user } });
  },

  updateUser: (dispatch: Dispatch<any>, user: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: { user } });
  },

  clearUser: (dispatch: Dispatch<any>) => {
    dispatch({ type: 'CLEAR_USER' });
  },

  resetStore: () => {
    return { type: 'RESET_STORE' };
  },
};

export default actions;
