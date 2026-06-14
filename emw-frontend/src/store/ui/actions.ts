import { Dispatch } from 'react';

const actions = {
  setLoading: (dispatch: Dispatch<any>, loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  },

  addAlert: (dispatch: Dispatch<any>, alert: { type: string; message: string }) => {
    dispatch({ type: 'ADD_ALERT', payload: alert });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_ALERT', payload: 0 });
    }, 5000);
  },

  removeAlert: (dispatch: Dispatch<any>, index: number) => {
    dispatch({ type: 'REMOVE_ALERT', payload: index });
  },
};

export default actions;
