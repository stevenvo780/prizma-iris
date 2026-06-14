import { FC, ChangeEvent } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface UploadModalProps {
  show: boolean;
  onHide: () => void;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => void;
  downloadTemplate: () => void;
}

const UploadModal: FC<UploadModalProps> = ({
  show,
  onHide,
  handleFileChange,
  handleUpload,
  downloadTemplate,
}) => {
  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Subir archivo Excel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group controlId='formFile' className='mb-3'>
            <Form.Label>Sube el formato de clientes para cargar los datos</Form.Label>
            <Form.Control type='file' onChange={handleFileChange} />
          </Form.Group>
          <Button variant='info' onClick={downloadTemplate}>
            Descargar Formato
          </Button>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={onHide}>
          Cerrar
        </Button>
        <Button variant='primary' onClick={handleUpload}>
          Subir
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UploadModal;
