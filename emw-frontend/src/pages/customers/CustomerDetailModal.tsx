import { FC } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Customer } from '@utils/types';

interface CustomerDetailModalProps {
  show: boolean;
  onHide: () => void;
  customer: Customer | null;
}

const CustomerDetailModal: FC<CustomerDetailModalProps> = ({ show, onHide, customer }) => {
  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Detalles del Cliente</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {customer && (
          <div>
            <p>
              <strong>Nombre:</strong> {customer.firstName}
            </p>
            <p>
              <strong>Apellido:</strong> {customer.lastName}
            </p>
            <p>
              <strong>Teléfono:</strong> {customer.phoneNumber}
            </p>
            <p>
              <strong>Email:</strong> {customer.email || 'No especificado'}
            </p>
            <p>
              <strong>Estado:</strong> {customer.status || 'activo'}
            </p>
            <p>
              <strong>Idioma:</strong> {customer.language || 'No especificado'}
            </p>
            <p>
              <strong>Zona horaria:</strong> {customer.timezone || 'No especificado'}
            </p>
            <p>
              <strong>Etiquetas:</strong>{' '}
              {customer.tags ? customer.tags.join(', ') : 'Sin etiquetas'}
            </p>
            {customer.notes && (
              <p>
                <strong>Notas:</strong> {customer.notes}
              </p>
            )}
            {customer.lastContactAt && (
              <p>
                <strong>Último contacto:</strong>{' '}
                {new Date(customer.lastContactAt).toLocaleString()}
              </p>
            )}
            {customer.createdAt && (
              <p>
                <strong>Creado:</strong> {new Date(customer.createdAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CustomerDetailModal;
