import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../rootReducer';
import { Customer } from '@utils/types';
import customerActions from './actions';
import api from '../../api';
import useUI from '../ui';
import * as XLSX from 'xlsx/xlsx';
import { convertKeysToEnglish, convertKeysToSpanish } from '@utils/conversions';

import { useCallback } from 'react';

const useCustomer = () => {
  const { customers, labels, totalPages } = useSelector((state: RootState) => state.customers);
  const { token: userToken } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();
  const { setLoading, addAlert } = useUI();

  const fetchCustomers = useCallback(
    async (page: number = 1, limit: number = 50, search: string = '') => {
      setLoading(true);
      try {
        const response = await api.customers.getCustomersAPI(page, limit, search);
        const responseData = response.data as any;

        // El backend retorna { data, total, totalPages, page } cuando hay paginación
        if (responseData.data && Array.isArray(responseData.data)) {
          customerActions.setCustomers(dispatch, responseData.data);
          customerActions.setTotalPages(dispatch, responseData.totalPages || 1);
        } else if (Array.isArray(responseData)) {
          // Fallback: respuesta sin paginación (array directo)
          customerActions.setCustomers(dispatch, responseData);
          customerActions.setTotalPages(dispatch, 1);
        } else {
          customerActions.setCustomers(dispatch, []);
          customerActions.setTotalPages(dispatch, 1);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
        addAlert({ type: 'danger', message: 'Ocurrió un error, consulta a soporte' });
      } finally {
        setLoading(false);
      }
    },
    [dispatch, setLoading, addAlert],
  );

  const createCustomer = useCallback(
    async (customer: Customer) => {
      setLoading(true);
      try {

        const cleanCustomerData = {
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          phoneNumber: customer.phoneNumber,
          email: customer.email,
          status: customer.status || 'active',
          notes: customer.notes,
          tags: customer.tags || [],
          companyName: (customer as any).companyName || customer.customFields?.company || '',
          title: (customer as any).title || customer.customFields?.title || '',
          campaign: (customer as any).campaign || customer.customFields?.campaign || '',
          data1: (customer as any).data1 || customer.customFields?.data1 || '',
          data2: (customer as any).data2 || customer.customFields?.data2 || '',
          data3: (customer as any).data3 || customer.customFields?.data3 || '',
        };

        const response = await api.customers.createCustomerAPI(cleanCustomerData);
        customerActions.addCustomer(dispatch, response.data);
        // No mostrar alerta aquí - la página que llama se encarga
      } catch (error) {
        console.error(`Error: ${error}`);
        // Re-lanzar error para que la página lo maneje
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, setLoading],
  );

  const updateCustomer = useCallback(
    async (id: number, customer: Customer) => {
      setLoading(true);
      try {
        const cleanCustomerData = {
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          phoneNumber: customer.phoneNumber,
          email: customer.email,
          status: customer.status,
          notes: customer.notes,
          tags: customer.tags || [],
          companyName: (customer as any).companyName || customer.customFields?.company || '',
          title: (customer as any).title || customer.customFields?.title || '',
          campaign: (customer as any).campaign || customer.customFields?.campaign || '',
          data1: (customer as any).data1 || customer.customFields?.data1 || '',
          data2: (customer as any).data2 || customer.customFields?.data2 || '',
          data3: (customer as any).data3 || customer.customFields?.data3 || '',
        };

        const response = await api.customers.updateCustomerAPI(id, cleanCustomerData);
        customerActions.updateCustomer(dispatch, response.data);
        // No mostrar alerta aquí - la página que llama se encarga

        setTimeout(() => {
          fetchCustomers();
        }, 500);
      } catch (error: any) {
        console.error('Error updating customer:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, setLoading, fetchCustomers],
  );

  const deleteCustomer = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        await api.customers.deleteCustomerAPI(id);
        customerActions.deleteCustomer(dispatch, id);
        // Alert manejado por la página
      } catch (error) {
        console.error(`Error: ${error}`);
        throw error; // Re-lanzar para que la página maneje el error
      } finally {
        setLoading(false);
      }
    },
    [dispatch, setLoading],
  );

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.customers.getLabelsAPI();

      const formattedLabels = response.data.map((label: string) => ({
        value: label,
        label: label
      }));
      customerActions.setLabels(dispatch, formattedLabels);
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({ type: 'danger', message: 'Ocurrió un error al cargar las etiquetas' });
    } finally {
      setLoading(false);
    }
  }, [dispatch, setLoading, addAlert]);

  const handleFileUpload = useCallback(
    async (file: File): Promise<void> => {
      setLoading(true);
      try {
        // Leer archivo como Promise para manejar errores correctamente
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as ArrayBuffer);
          reader.onerror = () => reject(new Error('Error al leer el archivo'));
          reader.readAsArrayBuffer(file);
        });

        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];

        // Filtrar filas completamente vacías
        const nonEmptyRows = rows.filter(row =>
          row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
        );

        const customers = nonEmptyRows.map(row => {
          const customer: any = {};
          headers.forEach((header, index) => {
            customer[header] = row[index];
          });
          return convertKeysToEnglish(customer);
        });

        const validCustomers = customers.filter(customer =>
          customer.phoneNumber && String(customer.phoneNumber).trim() !== ''
        );

        if (validCustomers.length === 0) {
          addAlert({ type: 'warning', message: 'No se encontraron clientes válidos en el archivo. Verifica que la columna "Telefono" tenga datos.' });
          return;
        }

        const response = await api.customers.uploadCustomersAPI({ customers: validCustomers });

        const { imported = 0, skipped = 0, errors = [] } = response.data || {};

        if (imported === 0 && skipped > 0) {
          addAlert({ type: 'warning', message: `${skipped} clientes fueron omitidos (posiblemente ya existen)` });
        } else if (imported > 0 && skipped > 0) {
          addAlert({ type: 'success', message: `${imported} importados, ${skipped} omitidos (duplicados)` });
        } else if (imported > 0) {
          addAlert({ type: 'success', message: `${imported} clientes importados exitosamente` });
        } else {
          addAlert({ type: 'info', message: 'No se importaron clientes nuevos' });
        }

        if (errors.length > 0) {
          addAlert({ type: 'warning', message: `${errors.length} clientes tuvieron errores durante la importación` });
        }

        await fetchCustomers();
      } catch (error: any) {
        console.error('Error importando clientes:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Ocurrió un error al subir el archivo';
        addAlert({ type: 'danger', message: errorMessage });
      } finally {
        setLoading(false);
      }
    },
    [setLoading, addAlert, fetchCustomers],
  );

  const downloadTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const template = [
        {
          Nombre: '',
          Apellido: '',
          Telefono: '',
          Email: '',
          NombreEmpresa: '',
          Titulo: '',
          Campaña: '',
          Notas: '',
          Etiquetas: '',
          Dato1: '',
          Dato2: '',
          Dato3: '',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
      XLSX.writeFile(wb, 'Plantilla_Clientes_EMW.xlsx');
    } catch (error) {
      console.error(`Error: ${error}`);
      addAlert({
        type: 'danger',
        message: 'Ocurrió un error al descargar la plantilla, consulta a soporte',
      });
    } finally {
      setLoading(false);
    }
  }, [setLoading, addAlert]);

  const downloadExcel = useCallback(async () => {
    setLoading(true);
    try {
      // Obtener TODOS los clientes sin paginación para exportar
      const response = await api.customers.getCustomersAPI(0, 0, '');
      const responseData = response.data as any;
      const allCustomers = Array.isArray(responseData) ? responseData : (responseData.data || customers);

      if (!allCustomers || allCustomers.length === 0) {
        addAlert({ type: 'warning', message: 'No hay clientes para exportar' });
        return;
      }

      const customersWithSpanishKeys = allCustomers.map((customer: any) => convertKeysToSpanish(customer));

      // Columnas fijas en orden consistente
      const columnOrder = ['Nombre', 'Apellido', 'Telefono', 'Email', 'NombreEmpresa', 'Titulo', 'Campaña', 'Notas', 'Etiquetas', 'Dato1', 'Dato2', 'Dato3', 'Estado'];

      const cleanCustomers = customersWithSpanishKeys.map((customer: any) => {
        const ordered: any = {};
        columnOrder.forEach(col => {
          let val = customer[col];
          // Tags como string separado por comas
          if (col === 'Etiquetas') {
            val = Array.isArray(val) ? val.join(', ') : (val || '');
          }
          // Asegurar que el teléfono conserve el +
          if (col === 'Telefono' && val && !String(val).startsWith('+')) {
            val = '+' + String(val);
          }
          // Reemplazar null/undefined con vacío
          ordered[col] = (val !== null && val !== undefined && val !== '') ? String(val) : '';
        });
        return ordered;
      });

      const ws = XLSX.utils.json_to_sheet(cleanCustomers);

      // Auto-ajustar ancho de columnas
      const colWidths = Object.keys(cleanCustomers[0] || {}).map(key => ({
        wch: Math.max(key.length, 15),
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      XLSX.writeFile(wb, 'Clientes_EMW.xlsx');
    } catch (error) {
      console.error('Error descargando Excel:', error);
      addAlert({ type: 'danger', message: 'Ocurrió un error al descargar el archivo' });
    } finally {
      setLoading(false);
    }
  }, [setLoading, addAlert, customers]);

  return {
    customers,
    labels,
    totalPages,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    fetchLabels,
    handleFileUpload,
    downloadTemplate,
    downloadExcel,
  };
};

export default useCustomer;
