import React from 'react';
import { Card, Row, Col, Button } from 'react-bootstrap';
import Image from 'next/image';
import { WppMS } from '@utils/types';
import { getFileType } from '@utils/fileUtils';
import {
  FaFileAudio,
  FaFileVideo,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileAlt,
  FaCheckCircle,
  FaTimes,
  FaTrash,
  FaEdit,
  FaGripVertical,
} from 'react-icons/fa';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MessageListItemProps {
  message: WppMS;
  index: number;
  onEdit: (message: WppMS) => void;
  onDelete: (messageId: string) => void;
  onToggleActive: (messageId: string, active: boolean) => void;
  onView: (message: WppMS) => void;
}

const MessageListItem: React.FC<MessageListItemProps> = ({
  message,
  index,
  onEdit,
  onDelete,
  onToggleActive,
  onView,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: message.id! });

  // Helper para extraer URL de mediaAttachments (puede ser array de objetos o string)
  const getMediaUrl = (): string | null => {
    if (!message.mediaAttachments) return null;
    if (Array.isArray(message.mediaAttachments)) {
      return message.mediaAttachments[0]?.url || null;
    }
    return typeof message.mediaAttachments === 'string' ? message.mediaAttachments : null;
  };

  const mediaUrl = getMediaUrl();

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) return;
    if (onView) onView(message);
  };

  const renderFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'video':
        return <FaFileVideo size={24} color='#4285F4' />;
      case 'audio':
        return <FaFileAudio size={24} color='#0F9D58' />;
      case 'pdf':
        return <FaFilePdf size={24} color='#DB4437' />;
      case 'word':
        return <FaFileWord size={24} color='#4285F4' />;
      case 'excel':
        return <FaFileExcel size={24} color='#0F9D58' />;
      default:
        return <FaFileAlt size={24} color='#F4B400' />;
    }
  };

  const renderFilePreview = () => {
    if (!mediaUrl) {
      return (
        <div
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
            border: '1px dashed #ccc',
            color: '#adb5bd',
            fontSize: 11,
          }}
        >
          <FaFileAlt size={20} />
        </div>
      );
    }

    const fileType = getFileType(mediaUrl);

    if (fileType === 'image') {
      return (
        <Image
          src={mediaUrl}
          alt='Vista previa'
          width={48}
          height={48}
          style={{ objectFit: 'cover', borderRadius: 8 }}
        />
      );
    }

    return (
      <div
        style={{
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: 8,
          border: '1px solid #e0e0e0',
        }}
      >
        {renderFileIcon(fileType)}
      </div>
    );
  };

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={sortableStyle}>
      <Card
        className='mb-3 shadow-sm'
        style={{
          minHeight: 80,
          borderRadius: 16,
          cursor: 'pointer',
          transition: 'box-shadow 0.2s',
          boxShadow: isDragging
            ? '0 8px 24px rgba(0,0,0,0.18)'
            : '0 2px 8px rgba(0,0,0,0.07)',
        }}
        onClick={handleCardClick}
        onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.13)')}
        onMouseOut={e =>
          (e.currentTarget.style.boxShadow = isDragging
            ? '0 8px 24px rgba(0,0,0,0.18)'
            : '0 2px 8px rgba(0,0,0,0.07)')
        }
      >
        <Card.Body style={{ padding: '12px 16px' }}>
          <Row
            className='align-items-center'
            style={{ width: '100%', margin: 0, flexWrap: 'nowrap' }}
          >
            {/* Drag handle + Número de orden */}
            <Col
              xs='auto'
              className='d-flex align-items-center gap-2 p-0'
              style={{ minWidth: 64 }}
            >
              <div
                {...attributes}
                {...listeners}
                style={{
                  cursor: 'grab',
                  color: '#adb5bd',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  touchAction: 'none',
                }}
                title='Arrastra para reordenar'
                onClick={e => e.stopPropagation()}
              >
                <FaGripVertical size={18} />
              </div>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: message.active ? '#ffc107' : '#e0e0e0',
                  color: message.active ? '#212529' : '#757575',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {index}
              </div>
            </Col>

            {/* Preview de archivo (compacto) */}
            <Col
              xs='auto'
              className='d-flex align-items-center justify-content-center p-0'
              style={{ minWidth: 60, marginLeft: 8 }}
            >
              <div style={{ width: 56, height: 56 }}>
                {renderFilePreview()}
              </div>
            </Col>

            {/* Contenido del mensaje */}
            <Col
              className='d-flex flex-column justify-content-center px-2'
              style={{ minWidth: 0, overflow: 'hidden' }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Mensaje {message.mediaType ? `(${message.mediaType})` : 'de Texto'}
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    color: message.active ? '#43a047' : '#e53935',
                    fontWeight: 600,
                  }}
                >
                  {message.active ? '● ACTIVO' : '○ INACTIVO'}
                </span>
              </div>
              <div
                style={{
                  color: '#616161',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {message.content}
              </div>
            </Col>

            {/* Botones de acción */}
            <Col
              xs='auto'
              className='d-flex align-items-center gap-1 p-0'
              style={{ minWidth: 48 }}
            >
              <Button
                variant='outline-primary'
                size='sm'
                onClick={e => {
                  e.stopPropagation();
                  onEdit(message);
                }}
                title='Editar'
                tabIndex={0}
                style={{
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FaEdit />
              </Button>
              <Button
                variant='outline-danger'
                size='sm'
                onClick={e => {
                  e.stopPropagation();
                  onDelete(message.id!);
                }}
                title='Borrar'
                tabIndex={0}
                style={{
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FaTrash />
              </Button>
              <Button
                variant='link'
                onClick={e => {
                  e.stopPropagation();
                  onToggleActive(message.id!, !message.active);
                }}
                style={{
                  color: message.active ? '#43a047' : '#e53935',
                  fontSize: 20,
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
                title={message.active ? 'Desactivar' : 'Activar'}
                tabIndex={0}
              >
                {message.active ? <FaCheckCircle /> : <FaTimes />}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default MessageListItem;
