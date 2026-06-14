import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../rootReducer';
import uiActions from './actions';
import { useCallback } from 'react';

const useUI = () => {
  const { loading, alerts } = useSelector((state: RootState) => state.ui);
  const dispatch = useDispatch();

  const setLoading = useCallback(
    (loading: boolean) => {
      uiActions.setLoading(dispatch, loading);
    },
    [dispatch],
  );

  const addAlert = useCallback(
    (alert: { type: string; message: string }) => {
      uiActions.addAlert(dispatch, alert);
    },
    [dispatch],
  );

  const removeAlert = useCallback(
    (index: number) => {
      uiActions.removeAlert(dispatch, index);
    },
    [dispatch],
  );

  return {
    loading,
    alerts,
    setLoading,
    addAlert,
    removeAlert,
  };
};

export default useUI;
