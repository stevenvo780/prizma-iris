import { WppMS } from '@utils/types';

export interface MessageState {
  messages: WppMS[];
  labels: { value: string; label: string }[];
}

export const initialMessageState: MessageState = {
  messages: [],
  labels: [{ value: '', label: 'Etiqueta' }],
};

interface Action {
  type: string;
  payload?: any;
}

const messageReducer = (
  state: MessageState = initialMessageState,
  action: Action,
): MessageState => {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'SET_LABELS':
      return { ...state, labels: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(message =>
          message.id === action.payload.id ? action.payload : message,
        ),
      };
    case 'DELETE_MESSAGE': {
      const targetId = String(action.payload);
      return {
        ...state,
        messages: state.messages.filter(message => String(message.id) !== targetId),
      };
    }
    default:
      return state;
  }
};

export default messageReducer;
