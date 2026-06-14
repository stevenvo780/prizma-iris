import { Templates } from '@utils/types';

export interface TemplateState {
  templates: Templates[];
}

const initialState: TemplateState = {
  templates: [],
};

interface Action {
  type: string;
  payload?: any;
}

const templatesReducer = (state: TemplateState = initialState, action: Action): TemplateState => {
  switch (action.type) {
    case 'SET_TEMPLATES':
      return {
        ...state,
        templates: action.payload,
      };

    case 'ADD_TEMPLATE':
      return {
        ...state,
        templates: [...state.templates, action.payload],
      };

    case 'UPDATE_TEMPLATE':
      return {
        ...state,
        templates: state.templates.map(template =>
          template.id === action.payload.id ? action.payload : template,
        ),
      };

    case 'DELETE_TEMPLATE':
      return {
        ...state,
        templates: state.templates.filter(template => template.id !== action.payload),
      };

    default:
      return state;
  }
};

export default templatesReducer;
