import { Dispatch } from 'react';
import { Customer } from '@utils/types';

const actions = {
  setCustomers: (dispatch: Dispatch<any>, customers: Customer[]) => {
    dispatch({ type: 'SET_CUSTOMERS', payload: customers });
  },

  setTotalPages: (dispatch: Dispatch<any>, totalPages: number) => {
    dispatch({ type: 'SET_TOTAL_PAGES', payload: totalPages });
  },

  addCustomer: (dispatch: Dispatch<any>, customer: Customer) => {
    dispatch({ type: 'ADD_CUSTOMER', payload: customer });
  },

  updateCustomer: (dispatch: Dispatch<any>, customer: Customer) => {
    dispatch({ type: 'UPDATE_CUSTOMER', payload: customer });
  },

  deleteCustomer: (dispatch: Dispatch<any>, id: number) => {
    dispatch({ type: 'DELETE_CUSTOMER', payload: id });
  },

  setLabels: (dispatch: Dispatch<any>, labels: any[]) => {
    dispatch({ type: 'SET_LABELS', payload: labels });
  },
};

export default actions;
