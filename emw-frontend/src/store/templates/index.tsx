import { ChangeEvent } from 'react';
import { Templates } from '@utils/types';
import templateActions from './actions';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../rootReducer';
import api from '../../api';
import useUI from '../ui';

const useTemplates = () => {
  const { templates } = useSelector((state: RootState) => state.templates);
  const dispatch = useDispatch();
  const { setLoading, addAlert } = useUI();

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.templates.getTemplatesAPI();
      templateActions.setTemplates(dispatch, response.data);
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({ type: 'danger', message: 'Ocurrió un error, consulta a soporte' });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: Templates) => {
    setLoading(true);
    try {
      const response = await api.templates.createTemplateAPI(template);
      templateActions.addTemplate(dispatch, response.data);
      addAlert({ type: 'success', message: 'Plantilla creada con éxito.' });
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({ type: 'danger', message: 'Error al crear la plantilla' });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (id: number, template: { active: boolean }) => {
    setLoading(true);
    try {
      const response = await api.templates.updateTemplateAPI(id, template);
      templateActions.updateTemplate(dispatch, response.data);
      addAlert({ type: 'success', message: 'Plantilla actualizada con éxito.' });
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({ type: 'danger', message: 'Error al actualizar la plantilla' });
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: number) => {
    setLoading(true);
    try {
      await api.templates.deleteTemplateAPI(id);
      templateActions.deleteTemplate(dispatch, id);
      addAlert({ type: 'success', message: 'Plantilla eliminada con éxito.' });
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({ type: 'danger', message: 'Error al eliminar la plantilla' });
    } finally {
      setLoading(false);
    }
  };

  return {
    templates,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};

export default useTemplates;
