import { Dispatch } from 'react';
import { PaymentDetails, ValidationResponse } from '@utils/types';

const actions = {
  setPaymentDetails: (dispatch: Dispatch<any>, details: PaymentDetails) => {
    dispatch({ type: 'SET_PAYMENT_DETAILS', payload: details });
  },

  setValidationResponse: (dispatch: Dispatch<any>, response: ValidationResponse) => {
    dispatch({ type: 'SET_VALIDATION_RESPONSE', payload: response });
  },
};

export default actions;
