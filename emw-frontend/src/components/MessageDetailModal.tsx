import React from 'react';
import { Modal, Button, Row, Col, Badge } from 'react-bootstrap';
import { WppMS } from '@utils/types';
import { FaCheckCircle, FaRegCircle, FaTimes } from 'react-icons/fa';
import Image from 'next/image';
import { getFileType } from '@/utils/fileUtils';

interface MessageDetailModalProps {
  show: boolean;
  handleClose: () => void;
  message: WppMS;
}

const MessageDetailModal: React.FC<MessageDetailModalProps> = ({ show, handleClose, message }) => {
  // Helper para extraer URL de mediaAttachments (puede ser array de objetos o string)
  const getMediaUrl = (): string | null => {
    if (!message.mediaAttachments) return null;
    if (Array.isArray(message.mediaAttachments)) {
      return message.mediaAttachments[0]?.url || null;
    }
    return typeof message.mediaAttachments === 'string' ? message.mediaAttachments : null;
  };
  const mediaUrl = getMediaUrl();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { variant: 'success', icon: <FaCheckCircle />, text: 'Activo' };
      case 'INACTIVE':
        return { variant: 'secondary', icon: <FaTimes />, text: 'Inactivo' };
      default:
        return { variant: 'secondary', icon: <FaRegCircle />, text: 'Desconocido' };
    }
  };
  const statusConfig = getStatusConfig(message.active ? 'ACTIVE' : 'INACTIVE');

  return (
    <Modal show={show} onHide={handleClose} size='lg' centered>
      <Modal.Header closeButton>
        <Modal.Title>Detalle del Mensaje</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className='mb-2'>
          {mediaUrl && getFileType(mediaUrl) === 'image' ? (
            <>
              <Col
                xs={12}
                md={4}
                className='text-center mb-3 mb-md-0 d-flex align-items-center justify-content-center'
              >
                <div
                  style={{
                    display: 'inline-block',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                  }}
                >
                  <Image
                    src={mediaUrl}
                    alt='Vista previa'
                    width={180}
                    height={180}
                    style={{ objectFit: 'cover', borderRadius: 8, maxWidth: 180, maxHeight: 180 }}
                  />
                </div>
              </Col>
              <Col xs={12} md={8}>
                <h5 style={{ fontWeight: 600 }}>
                  Mensaje {message.mediaType ? `(${message.mediaType})` : 'de Texto'}
                </h5>
                <div style={{ color: '#616161', fontSize: 15, marginBottom: 8 }}>
                  {message.content}
                </div>
                <Row className='mb-2'>
                  <Col xs={6}>
                    <div>
                      <strong>Estado:</strong>{' '}
                      <Badge bg={statusConfig.variant}>
                        {statusConfig.icon} {statusConfig.text}
                      </Badge>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div>
                      <strong>Activo:</strong>{' '}
                      {message.active ? (
                        <FaCheckCircle color='#43a047' />
                      ) : (
                        <FaRegCircle color='#bdbdbd' />
                      )}
                    </div>
                  </Col>
                </Row>
                <Row className='mb-2'>
                  <Col xs={6}>
                    <div>
                      <strong>Tipo:</strong> {message.messageType || 'text'}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div>
                      <strong>Orden:</strong> {message.order || '-'}
                    </div>
                  </Col>
                </Row>
                {message.mediaType && (
                  <Row className='mb-2'>
                    <Col xs={12}>
                      <div>
                        <strong>Tipo de Media:</strong> <code>{message.mediaType}</code>
                      </div>
                    </Col>
                  </Row>
                )}
              </Col>
            </>
          ) : (
            <Col xs={12}>
              <h5 style={{ fontWeight: 600 }}>
                Mensaje {message.mediaType ? `(${message.mediaType})` : 'de Texto'}
              </h5>
              <div style={{ color: '#616161', fontSize: 15, marginBottom: 8 }}>
                {message.content}
              </div>
              <Row className='mb-2'>
                <Col xs={6}>
                  <div>
                    <strong>Estado:</strong>{' '}
                    <Badge bg={statusConfig.variant}>
                      {statusConfig.icon} {statusConfig.text}
                    </Badge>
                  </div>
                </Col>
                <Col xs={6}>
                  <div>
                    <strong>Activo:</strong>{' '}
                    {message.active ? (
                      <FaCheckCircle color='#43a047' />
                    ) : (
                      <FaRegCircle color='#bdbdbd' />
                    )}
                  </div>
                </Col>
              </Row>
              <Row className='mb-2'>
                <Col xs={6}>
                  <div>
                    <strong>Tipo:</strong> {message.messageType || 'text'}
                  </div>
                </Col>
                <Col xs={6}>
                  <div>
                    <strong>Orden:</strong> {message.order || '-'}
                  </div>
                </Col>
              </Row>
              {message.mediaType && (
                <Row className='mb-2'>
                  <Col xs={12}>
                    <div>
                      <strong>Tipo de Media:</strong> <code>{message.mediaType}</code>
                    </div>
                  </Col>
                </Row>
              )}
              {mediaUrl && getFileType(mediaUrl) !== 'image' && (
                <Row className='mb-2'>
                  <Col xs={12}>
                    <div>
                      <strong>Archivo adjunto:</strong>{' '}
                      <a href={mediaUrl} target='_blank' rel='noopener noreferrer'>
                        Ver archivo
                      </a>
                    </div>
                  </Col>
                </Row>
              )}
            </Col>
          )}
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={handleClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MessageDetailModal;
