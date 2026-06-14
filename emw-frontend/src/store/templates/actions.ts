import { Dispatch } from 'react';
import { Templates } from '@utils/types';

const actions = {
  setTemplates: (dispatch: Dispatch<any>, templates: Templates[]) => {
    dispatch({ type: 'SET_TEMPLATES', payload: templates });
  },

  addTemplate: (dispatch: Dispatch<any>, template: Templates) => {
    dispatch({ type: 'ADD_TEMPLATE', payload: template });
  },

  updateTemplate: (dispatch: Dispatch<any>, template: Templates) => {
    dispatch({ type: 'UPDATE_TEMPLATE', payload: template });
  },

  deleteTemplate: (dispatch: Dispatch<any>, id: number) => {
    dispatch({ type: 'DELETE_TEMPLATE', payload: id });
  },
};

export default actions;
