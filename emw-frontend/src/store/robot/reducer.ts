import { AutoReplyConfig, MessageLog } from '@utils/types';

export interface RobotState {
  autoReply: AutoReplyConfig | null;
  messageLogs: MessageLog[];
  totalLogs: number;
}

export const initialRobotState: RobotState = {
  autoReply: null,
  messageLogs: [],
  totalLogs: 0,
};

interface Action {
  type: string;
  payload?: any;
}

const reducer = (state: RobotState = initialRobotState, action: Action): RobotState => {
  switch (action.type) {
    case 'SET_AUTO_REPLY_CONFIG':
      return { ...state, autoReply: action.payload };
    case 'SET_ROBOT_MESSAGE_LOGS':
      return {
        ...state,
        messageLogs: action.payload.logs,
        totalLogs: action.payload.total,
      };
    default:
      return state;
  }
};

export default reducer;
