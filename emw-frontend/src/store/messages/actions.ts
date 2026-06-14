import { Dispatch } from 'react';
import { WppMS } from '@utils/types';

const actions = {
  setMessages: (dispatch: Dispatch<any>, messages: WppMS[]) => {
    dispatch({ type: 'SET_MESSAGES', payload: messages });
  },

  addMessage: (dispatch: Dispatch<any>, message: WppMS) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  },

  updateMessage: (dispatch: Dispatch<any>, message: WppMS) => {
    dispatch({ type: 'UPDATE_MESSAGE', payload: message });
  },

  deleteMessage: (dispatch: Dispatch<any>, id: string | number) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: id });
  },

  setLabels: (dispatch: Dispatch<any>, labels: any[]) => {
    dispatch({ type: 'SET_LABELS', payload: labels });
  },
};

export default actions;
