import { combineReducers } from '@reduxjs/toolkit';
import userReducer from './user/reducer';
import customerReducer from './customers/reducer';
import messagesReducer from './messages/reducer';
import templatesReducer from './templates/reducer';
import uiReducer from './ui/reducer';
import robotReducer from './robot/reducer';
import paymentsReducer from './payments/reducer';

const rootReducer = combineReducers({
  payments: paymentsReducer,
  robot: robotReducer,
  user: userReducer,
  customers: customerReducer,
  messages: messagesReducer,
  templates: templatesReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
