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
              {customer.tagAssignments && customer.tagAssignments.length > 0
                ? customer.tagAssignments.map((ta: any, i: number) => (
                    <span key={i} className="badge bg-primary me-1">{ta.tag?.name || ta.name}</span>
                  ))
                : customer.tags && customer.tags.length > 0
                  ? customer.tags.map((t: string, i: number) => (
                      <span key={i} className="badge bg-primary me-1">{t}</span>
                    ))
                  : 'Sin etiquetas'}
            </p>
            {customer.customFields && Object.keys(customer.customFields).length > 0 && (
              <>
                {customer.customFields.company && (
                  <p><strong>Empresa:</strong> {customer.customFields.company}</p>
                )}
                {customer.customFields.title && (
                  <p><strong>Título / Cargo:</strong> {customer.customFields.title}</p>
                )}
                {customer.customFields.campaign && (
                  <p><strong>Campaña:</strong> {customer.customFields.campaign}</p>
                )}
                {customer.customFields.data1 && (
                  <p><strong>Dato 1:</strong> {customer.customFields.data1}</p>
                )}
                {customer.customFields.data2 && (
                  <p><strong>Dato 2:</strong> {customer.customFields.data2}</p>
                )}
                {customer.customFields.data3 && (
                  <p><strong>Dato 3:</strong> {customer.customFields.data3}</p>
                )}
              </>
            )}
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
