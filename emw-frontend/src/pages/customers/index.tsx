import { useState, ChangeEvent, FC, useEffect } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { withAuthSync } from '@utils/auth';
import CustomerList from './CustomerList';
import useCustomer from '@store/customers';
import useUser from '@store/user';
import useUI from '@/store/ui';
import { Customer } from '@utils/types';
import CustomerDetailModal from './CustomerDetailModal';
import CustomerFormModal from './CustomerFormModal';
import UploadModal from './UploadModal';
import Pagination from 'rc-pagination';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import 'rc-pagination/assets/index.css';
import styles from '@styles/Customers.module.css';

const Customers: FC = () => {
  const { setLoading, addAlert } = useUI();
  const {
    customers,
    labels,
    totalPages,
    fetchCustomers,
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

  const { token } = useUser();

  useEffect(() => {
    if (token) {
      fetchCustomers(page, limit, search);
    }
  }, [page, limit, search, fetchCustomers, token]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const createOrUpdateCustomer = async () => {
    try {
      setLoading(true);
      if (isUpdating) {
        await updateCustomer(customer.id || 0, customer);
        setIsUpdating(false);
      } else {
        await createCustomer(customer);
      }
    } catch (err) {
      console.error('Error al guardar cliente:', err);
      addAlert({
        type: 'danger',
        message: `Error al ${isUpdating ? 'actualizar' : 'crear'} cliente`,
      });
    } finally {
      setLoading(false);
      setShowModalCreate(false);
      resetForm();
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
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (file) {
      try {
        setLoading(true);
        await handleFileUpload(file);
        addAlert({ type: 'success', message: 'Contactos subidos correctamente' });
        setShowUploadModal(false);
      } catch (err) {
        console.error('Error al subir contactos:', err);
        addAlert({ type: 'danger', message: 'Error al subir contactos' });
      } finally {
        setLoading(false);
      }
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
      <Container className={`container`}>
        <Row>
          <Col sm='2'>
            <h2>Clientes</h2>
          </Col>
          <Col sm='3'>
            <Form.Control
              type='text'
              placeholder='Buscar...'
              value={search}
              onChange={handleSearchChange}
            />
          </Col>
          <Col>
            <Button variant='warning' onClick={() => setShowUploadModal(true)}>
              Cargar clientes
            </Button>
          </Col>
          <Col>
            <Button variant='secondary' onClick={handleDownloadExcel}>
              Descargar Excel
            </Button>
          </Col>
          <Col>
            <Button
              variant='secondary'
              onClick={() => {
                setIsUpdating(false);
                resetForm();
                setShowModalCreate(true);
              }}
            >
              Nuevo cliente
            </Button>
          </Col>
          <Col sm='1'>
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
