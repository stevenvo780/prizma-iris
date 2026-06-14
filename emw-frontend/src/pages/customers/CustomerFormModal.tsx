import { FC, ChangeEvent } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { Customer } from '@utils/types';
import CustomerForm from './CustomerForm';

interface CustomerFormModalProps {
  show: boolean;
  onHide: () => void;
  isUpdating: boolean;
  customer: Customer;
  labels: { value: string; label: string }[];
  handleInputChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  handleSelectChange: (event: any) => void;
  handleSave: () => void;
  handleCancel: () => void;
}

const CustomerFormModal: FC<CustomerFormModalProps> = ({
  show,
  onHide,
  isUpdating,
  customer,
  labels,
  handleInputChange,
  handleSelectChange,
  handleSave,
  handleCancel,
}) => {
  return (
    <Modal show={show} onHide={onHide} size='lg'>
      <Modal.Header closeButton>
        <Modal.Title>{isUpdating ? 'Actualizar Cliente' : 'Crear Cliente'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <CustomerForm
          customer={customer}
          labels={labels}
          handleInputChange={handleInputChange}
          handleSelectChange={handleSelectChange}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button
          style={{ margin: 10 }}
          variant='success'
          onClick={handleSave}
          className='btn btn-success'
        >
          {isUpdating ? 'Actualizar' : 'Crear'}
        </Button>
        {isUpdating && (
          <Button variant='secondary' onClick={handleCancel} className='btn btn-danger'>
            Cancelar
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CustomerFormModal;
