import { AutoReplyConfig } from '@utils/types';
import robotActions from './actions';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../rootReducer';
import api from '../../api';
import useUI from '../ui';
import * as XLSX from 'xlsx';

const useRobot = () => {
  const { autoReply, messageLogs, totalLogs } = useSelector(
    (state: RootState) => state.robot,
  );
  const dispatch = useDispatch();
  const { setLoading, addAlert } = useUI();

  const fetchAutoReplyConfig = async () => {
    try {
      const response = await api.robot.getAutoReplyConfigAPI();
      robotActions.setAutoReplyConfig(dispatch, response.data);
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({ type: 'danger', message: 'Error al obtener la configuración de auto-respuesta' });
    }
  };

  const updateAutoReplyConfig = async (config: AutoReplyConfig) => {
    setLoading(true);
    try {
      const response = await api.robot.updateAutoReplyConfigAPI(config);
      robotActions.setAutoReplyConfig(dispatch, response.data);
      addAlert({
        type: 'success',
        message: config.enabled
          ? 'Auto-respuesta activada correctamente'
          : 'Auto-respuesta desactivada',
      });
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({ type: 'danger', message: 'Error al actualizar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  const getMessageLogs = async (limit: number = 50, offset: number = 0) => {
    setLoading(true);
    try {
      const response = await api.robot.getMessageLogsAPI(limit, offset);
      robotActions.setRobotMessageLogs(dispatch, response.data);
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({
        type: 'danger',
        message: 'Ocurrió un error al obtener los registros de mensajes',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadMessageLogsExcel = async (count: number = 100) => {
    setLoading(true);
    try {
      const response = await api.robot.getMessageLogsAPI(count, 0);

      if (!response.data || !response.data.data) {
        throw new Error('No se recibieron datos válidos');
      }

      const logs = response.data.data;
      const excelData = logs.map(log => ({
        Número: log.recipientNumber,
        Estado: log.sent ? 'Enviado' : 'Fallido',
        Razón: log.reason || '-',
        Fecha: new Date(log.createdAt).toLocaleString('es-ES'),
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros de Mensajes');

      const date = new Date().toISOString().split('T')[0];
      const fileName = `registros_mensajes_${date}.xlsx`;

      XLSX.writeFile(workbook, fileName);

      addAlert({ type: 'success', message: 'Archivo Excel generado correctamente' });
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({ type: 'danger', message: 'Ocurrió un error al generar el archivo Excel' });
    } finally {
      setLoading(false);
    }
  };

  return {
    autoReply,
    messageLogs,
    totalLogs,
    fetchAutoReplyConfig,
    updateAutoReplyConfig,
    getMessageLogs,
    downloadMessageLogsExcel,
  };
};

export default useRobot;
