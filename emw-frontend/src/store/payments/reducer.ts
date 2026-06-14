import { PaymentDetails, ValidationResponse } from '@utils/types';

export interface PaymentState {
  paymentDetails: PaymentDetails | null;
  validationResponse: ValidationResponse | null;
}

export const initialPaymentState: PaymentState = {
  paymentDetails: null,
  validationResponse: null,
};

interface Action {
  type: string;
  payload?: any;
}

const reducer = (state: PaymentState = initialPaymentState, action: Action): PaymentState => {
  switch (action.type) {
    case 'SET_PAYMENT_DETAILS':
      return { ...state, paymentDetails: action.payload };
    case 'SET_VALIDATION_RESPONSE':
      return { ...state, validationResponse: action.payload };
    default:
      return state;
  }
};

export default reducer;
