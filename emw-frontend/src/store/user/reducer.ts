import { User, Action } from '@utils/types';

export interface UserState {
  token: string | null;
  user: User | null;
}

const getInitialState = (): UserState => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        return { token, user };
      } catch (e) {
        console.warn('Error parsing user from localStorage:', e);
      }
    }
  }

  return {
    token: null,
    user: null,
  };
};

export const initialUserState: UserState = getInitialState();

const reducer = (state: UserState = initialUserState, action: Action): UserState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload.user };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload.user } };
    case 'SET_TOKEN':
      return { ...state, token: action.payload.token };
    case 'CLEAR_USER':
      return initialUserState;
    case 'RESET_STORE':
      return { ...initialUserState };
    default:
      return state;
  }
};

export default reducer;
