import { useState, ChangeEvent, FC, useEffect } from 'react';
import SeoHead from '@components/SeoHead';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { withAuthSync } from '@utils/auth';
import CustomerList from '@components/customers/CustomerList';
import useCustomer from '@store/customers';
import useUI from '@/store/ui';
import { Customer } from '@utils/types';
import CustomerDetailModal from '@components/customers/CustomerDetailModal';
import CustomerFormModal from '@components/customers/CustomerFormModal';
import UploadModal from '@components/customers/UploadModal';
import Pagination from 'rc-pagination';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import 'rc-pagination/assets/index.css';
import styles from '@styles/Customers.module.css';

// Locale en español para la paginación
const localeES = {
  items_per_page: '/ página',
  jump_to: 'Ir a',
  jump_to_confirm: 'confirmar',
  page: '',
  prev_page: 'Página anterior',
  next_page: 'Página siguiente',
  prev_5: '5 páginas anteriores',
  next_5: '5 páginas siguientes',
  prev_3: '3 páginas anteriores',
  next_3: '3 páginas siguientes',
};

const Customers: FC = () => {
  const { setLoading, addAlert } = useUI();
  const {
    customers,
    labels,
    totalPages,
    fetchCustomers,
    fetchLabels,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    handleFileUpload,
    downloadTemplate,
    downloadExcel,
  } = useCustomer();

  const [page, setPage] = useState(1);
  const [customer, setCustomer] = useState<Customer>({} as Customer);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showModalDetail, setShowModalDetail] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showModalCreate, setShowModalCreate] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchCustomers(page, limit, search);
    fetchLabels();
  }, [page, limit, search, fetchCustomers, fetchLabels]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const createOrUpdateCustomer = async () => {
    // Validación de campos obligatorios - solo teléfono es obligatorio
    if (!customer.phoneNumber?.trim()) {
      addAlert({ type: 'danger', message: 'El teléfono es obligatorio' });
      return;
    }
    // Validar formato de teléfono: debe comenzar con + y tener solo dígitos
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(customer.phoneNumber.trim())) {
      addAlert({ type: 'danger', message: 'El teléfono debe tener formato internacional (ej: +573001234567)' });
      return;
    }
    // Validar email si está presente
    if (customer.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email.trim())) {
        addAlert({ type: 'danger', message: 'El email no tiene un formato válido' });
        return;
      }
    }

    try {
      setLoading(true);

      if (isUpdating) {
        await updateCustomer(customer.id || 0, customer);
        setIsUpdating(false);
      } else {
        await createCustomer(customer);
      }
      setShowModalCreate(false);
      resetForm();

      setTimeout(() => {
        fetchCustomers(page, limit, search);
      }, 500);

      addAlert({
        type: 'success',
        message: `Cliente ${isUpdating ? 'actualizado' : 'creado'} exitosamente`,
      });

      fetchLabels();
    } catch (err: any) {
      console.error('Error al guardar cliente:', err);
      let errorMessage = `Error al ${isUpdating ? 'actualizar' : 'crear'} cliente`;

      if (err.response?.data?.message?.includes('duplicate key')) {
        if (err.response.data.message.includes('phoneNumber')) {
          errorMessage = 'Este número de teléfono ya está registrado';
        } else if (err.response.data.message.includes('email')) {
          errorMessage = 'Este email ya está registrado';
        } else {
          errorMessage = 'Ya existe un cliente con estos datos';
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      addAlert({
        type: 'danger',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCustomerSelect = (id: number) => {
    const selectedCustomer = customers.find((i: Customer) => i.id === id);
    if (selectedCustomer) {
      setCustomer(selectedCustomer);
      setIsUpdating(true);
      setShowModalCreate(true);
    }
  };

  const resetForm = () => {
    setCustomer({} as Customer);
  };

  const handleShowModalDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowModalDetail(true);
  };

  const handleCloseModalDetail = () => {
    setSelectedCustomer(null);
    setShowModalDetail(false);
  };

  const handleSelectChange = (event: any) => {
    const tagsData: string[] = [];
    for (let index = 0; index < event.length; index++) {
      const tagValue = event[index].value;
      tagsData.push(tagValue);
    }
    setCustomer({ ...customer, ['tags']: tagsData });

    setTimeout(() => fetchLabels(), 500);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      addAlert({ type: 'warning', message: 'Selecciona un archivo primero' });
      return;
    }
    try {
      await handleFileUpload(file);
      setShowUploadModal(false);
      setFile(null);
    } catch (err) {
      console.error('Error al subir contactos:', err);
    }
  };

  const handlePageChange = (current: number) => {
    setPage(current);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearch(searchValue);
    if (searchValue.length >= 3 || searchValue.length === 0) {
      fetchCustomers(1, limit, searchValue);
    }
  };

  const handleLimitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value));
  };

  const handleDeleteCustomer = async (id: number) => {
    // Confirmación antes de eliminar
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoading(true);
      await deleteCustomer(id);
      addAlert({ type: 'success', message: 'Cliente eliminado correctamente' });
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      addAlert({ type: 'danger', message: 'Error al eliminar cliente' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setLoading(true);
      await downloadExcel();
      addAlert({ type: 'success', message: 'Excel descargado correctamente' });
    } catch (err) {
      console.error('Error al descargar Excel:', err);
      addAlert({ type: 'danger', message: 'Error al descargar Excel' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      await downloadTemplate();
      addAlert({ type: 'success', message: 'Plantilla descargada correctamente' });
    } catch (err) {
      console.error('Error al descargar plantilla:', err);
      addAlert({ type: 'danger', message: 'Error al descargar plantilla' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SeoHead title="Clientes" description="Importa, organiza y segmenta tu base de contactos con etiquetas y campos personalizados en Iris." pathname="/customers" noIndex />
      <Container className={`container`}>
        <Row className='align-items-center g-2 mb-2'>
          <Col xs={12} md={3} lg={2}>
            <h2 className='mb-0'>Clientes</h2>
          </Col>
          <Col xs={12} md={4} lg={3}>
            <Form.Control
              type='text'
              placeholder='Buscar...'
              value={search}
              onChange={handleSearchChange}
            />
          </Col>
          <Col xs={4} sm='auto'>
            <Button variant='warning' className='w-100' onClick={() => setShowUploadModal(true)}>
              Cargar
            </Button>
          </Col>
          <Col xs={4} sm='auto'>
            <Button variant='secondary' className='w-100' onClick={handleDownloadExcel}>
              Excel
            </Button>
          </Col>
          <Col xs={4} sm='auto'>
            <Button
              variant='secondary'
              className='w-100'
              onClick={() => {
                setIsUpdating(false);
                resetForm();
                setShowModalCreate(true);
              }}
            >
              Nuevo
            </Button>
          </Col>
          <Col xs={6} sm={3} md={2} lg={1}>
            <Form.Select value={limit} onChange={handleLimitChange}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Form.Select>
          </Col>
        </Row>
        <hr />
        <CustomerList
          customers={customers}
          handleShowModal={handleShowModalDetail}
          updateCustomerSelect={updateCustomerSelect}
          deleteCustomer={handleDeleteCustomer}
        />
        <div className={styles.paginationContainer}>
          <Pagination
            current={page}
            total={totalPages * limit}
            pageSize={limit}
            onChange={handlePageChange}
            locale={localeES}
            prevIcon={<FaChevronLeft />}
            nextIcon={<FaChevronRight />}
            style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}
            itemRender={(current, type, element) => {
              if (type === 'prev') {
                return <FaChevronLeft style={{ color: '#FFC313' }} />;
              }
              if (type === 'next') {
                return <FaChevronRight style={{ color: '#FFC313' }} />;
              }
              return element;
            }}
          />
        </div>
      </Container>
      <CustomerDetailModal
        show={showModalDetail}
        onHide={handleCloseModalDetail}
        customer={selectedCustomer}
      />
      <CustomerFormModal
        show={showModalCreate}
        onHide={() => setShowModalCreate(false)}
        isUpdating={isUpdating}
        customer={customer}
        labels={labels}
        handleInputChange={handleInputChange}
        handleSelectChange={handleSelectChange}
        handleSave={createOrUpdateCustomer}
        handleCancel={() => {
          setIsUpdating(false);
          setCustomer({} as Customer);
          setShowModalCreate(false);
        }}
      />
      <UploadModal
        show={showUploadModal}
        onHide={() => setShowUploadModal(false)}
        handleFileChange={handleFileChange}
        handleUpload={handleUpload}
        downloadTemplate={handleDownloadTemplate}
      />
    </>
  );
};

export default withAuthSync(Customers);

export async function getServerSideProps(context: any) {
  return { props: {} };
}
