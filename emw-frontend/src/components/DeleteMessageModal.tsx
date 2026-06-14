import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface DeleteMessageModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  templateName?: string;
}

const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  show,
  onHide,
  onConfirm,
  templateName,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirmar eliminación</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className='text-center mb-3'>
          <div className='display-4 text-danger mb-2'>
            <i className='fas fa-trash-alt'></i>
          </div>
          <p className='fw-bold mb-2'>
            {templateName
              ? `¿Estás seguro de que quieres eliminar el template "${templateName}"? Esto también lo eliminará de WhatsApp Business API.`
              : '¿Estás seguro de que quieres eliminar este mensaje?'}
          </p>
          <p className='text-muted mb-0'>Esta acción no se puede deshacer.</p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={onHide}>
          Cancelar
        </Button>
        <Button variant='danger' onClick={onConfirm}>
          Eliminar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteMessageModal;
