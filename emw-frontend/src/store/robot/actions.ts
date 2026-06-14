import { Dispatch } from 'redux';
import { AutoReplyConfig, MessageLogsResponse } from '@utils/types';

const setAutoReplyConfig = (dispatch: Dispatch, config: AutoReplyConfig) => {
  dispatch({
    type: 'SET_AUTO_REPLY_CONFIG',
    payload: config,
  });
};

const setRobotMessageLogs = (dispatch: Dispatch, logs: MessageLogsResponse) => {
  dispatch({
    type: 'SET_ROBOT_MESSAGE_LOGS',
    payload: {
      logs: logs.data,
      total: logs.total,
    },
  });
};

const robotActions = {
  setAutoReplyConfig,
  setRobotMessageLogs,
};

export default robotActions;
