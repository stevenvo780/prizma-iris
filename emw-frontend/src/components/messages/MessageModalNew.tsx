import React, { FC, ChangeEvent, useEffect, useRef, useState, DragEvent } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import Select from 'react-select';
import Image from 'next/image';
import { WppMS } from '@utils/types';
import { getFileType, getFileNameFromUrl } from '@utils/fileUtils';
import styles from '@styles/Messages.module.css';
import { FaFileAudio, FaFileVideo, FaFile, FaImage, FaUpload } from 'react-icons/fa';
import { IconType } from 'react-icons';
import VariableButtons from '@/components/VariableButtons';
import { getWhatsappPreview } from '@utils/variablePreview';

interface MessageModalProps {
  show: boolean;
  handleClose: () => void;
  currentMessage: WppMS;
  handleInputChange: any;
  onSaveMessage: (message: WppMS) => void;
  localImageUrl: string | null;
  setLocalImageUrl: (url: string | null) => void;
  labels: { value: string; label: string }[];
  messagesLength: number;
}

const MessageModal: FC<MessageModalProps> = ({
  show,
  handleClose,
  currentMessage,
  handleInputChange,
  onSaveMessage,
  localImageUrl,
  setLocalImageUrl,
  messagesLength,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; type: string; size: number } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [hasFileLoaded, setHasFileLoaded] = useState(false);

  const [messageData, setMessageData] = useState<WppMS>({
    content: '',
    mediaAttachments: null,
    active: true,
    order: 1,
  });

  const [previewText, setPreviewText] = useState('');
  const initializedRef = useRef(false);
  const lastMessageIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setPreviewText(getWhatsappPreview(messageData.content || ''));
  }, [messageData.content]);

  useEffect(() => {
    // Detectar si es un mensaje diferente (modo edición) o modal nuevo
    const messageIdChanged = currentMessage.id !== lastMessageIdRef.current;

    if (show && (!initializedRef.current || messageIdChanged)) {
      initializedRef.current = true;
      lastMessageIdRef.current = currentMessage.id;

      const defaultData = {
        content: '',
        mediaAttachments: null,
        active: true,
        order: messagesLength + 1,
      };

      setMessageData({
        ...defaultData,
        ...currentMessage,
      });

      // mediaAttachments puede ser un array de objetos [{type, url, caption}] o una string URL (legacy)
      const mediaUrl = Array.isArray(currentMessage.mediaAttachments)
        ? currentMessage.mediaAttachments[0]?.url
        : currentMessage.mediaAttachments;

      if (mediaUrl && typeof mediaUrl === 'string') {
        const fileType = getFileType(mediaUrl);
        setLocalImageUrl(mediaUrl);
        setHasFileLoaded(true);
        setFileInfo({
          name: getFileNameFromUrl(mediaUrl),
          type: fileType === 'image' ? 'image/jpeg' : 'application/octet-stream',
          size: 0,
        });
      } else {
        setLocalImageUrl(null);
        setFileInfo(null);
        setFileError(null);
        setHasFileLoaded(false);
      }
    }

    if (!show) {
      initializedRef.current = false;
    }
  }, [show, currentMessage, messagesLength, setLocalImageUrl]);

  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processFile = (file: File) => {
    setFileError(null);

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileError(
        `El archivo excede el tamaño máximo permitido de 10MB. Tamaño actual: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      );
      return;
    }

    setFileInfo({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    setHasFileLoaded(true);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalImageUrl(reader.result as string);
        handleInputChange({ target: { name: 'file', value: file } });
      };
      reader.readAsDataURL(file);
    } else {
      setLocalImageUrl(null);
      handleInputChange({ target: { name: 'file', value: file } });
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!fileInfo && !localImageUrl) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!fileInfo && !localImageUrl) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!fileInfo && !localImageUrl && e.dataTransfer.files?.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setLocalImageUrl(null);
    setFileInfo(null);
    setFileError(null);
    setHasFileLoaded(false);
    // Importante: marcar que el archivo fue eliminado (null o array vacío)
    setMessageData(prev => ({ ...prev, mediaAttachments: null, mediaType: null }));
    handleInputChange({ target: { name: 'file', value: null } });
    handleInputChange({ target: { name: 'mediaAttachments', value: null } });
  };

  const getFileIcon = (): IconType => {
    if (!fileInfo) return FaFile;

    const fileType = fileInfo.type.toLowerCase();

    if (fileType.startsWith('image/')) {
      return FaImage;
    } else if (fileType.startsWith('video/')) {
      return FaFileVideo;
    } else if (fileType.startsWith('audio/')) {
      return FaFileAudio;
    } else {
      return FaFile;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const orderOptions = Array.from({ length: messagesLength + 1 }, (_, i) => ({
    value: i + 1,
    label: (i + 1).toString(),
  }));

  const handleInputChangeLocal = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    const stateKey = name === 'message' ? 'content' : name;
    setMessageData(prev => ({ ...prev, [stateKey]: value }));

  };

  const handleSave = () => {
    onSaveMessage(messageData);
  };

  const handleVariableInsert = (variable: string) => {
    setMessageData(prev => ({ ...prev, content: (prev.content || '') + variable }));

  };

  const isEditing = !!currentMessage.id;

  return (
    <Modal show={show} onHide={handleClose} size='lg'>
      <Modal.Header closeButton>
        <Modal.Title>{isEditing ? 'Editar Mensaje' : 'Crear Mensaje'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className='mb-3'>
          <Col sm={9}>
            <Form.Group className='mb-3'>
              <Form.Label>Contenido del Mensaje</Form.Label>
              <Form.Control
                as='textarea'
                name='message'
                value={messageData.content}
                onChange={handleInputChangeLocal}
                rows={4}
                size='sm'
                placeholder='Escribe el contenido de tu mensaje aquí...'
              />
              <Form.Text className='text-muted'>
                Puedes incluir variables como {`{{firstName}}`}, {`{{lastName}}`},{' '}
                {`{{companyName}}`}, etc.
              </Form.Text>
            </Form.Group>

            <div className='mb-3'>
              <VariableButtons onVariableInsert={handleVariableInsert} />
            </div>

            {messageData.content && (
              <div className='mb-3'>
                <strong>Vista previa:</strong>
                <div
                  className='mt-2 p-2 bg-light rounded'
                  style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
                >
                  {previewText}
                </div>
              </div>
            )}
          </Col>

          <Col sm={3}>
            <Form.Label>Archivo Multimedia</Form.Label>
            <div
              className={`${styles.fileUploadContainer} ${isDragging ? styles.dragging : ''}`}
              onClick={() => !fileInfo && !localImageUrl && openFileSelector()}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                position: 'relative',
                height: '150px',
                overflow: 'hidden',
              }}
            >
              <div
                className={fileInfo || localImageUrl ? styles.fileWrapper : styles.filePlaceholder}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                {(() => {
                  const imageSrc =
                    currentMessage.mediaAttachments &&
                    typeof currentMessage.mediaAttachments === 'string' &&
                    getFileType(currentMessage.mediaAttachments) === 'image'
                      ? currentMessage.mediaAttachments
                      : localImageUrl &&
                          typeof localImageUrl === 'string' &&
                          getFileType(localImageUrl) === 'image'
                        ? localImageUrl
                        : undefined;

                  if (imageSrc) {
                    return (
                      <div
                        className='d-flex flex-column align-items-center justify-content-center w-100'
                        style={{ position: 'relative' }}
                      >
                        <Image
                          src={imageSrc}
                          alt='Vista previa'
                          width={120}
                          height={120}
                          style={{
                            borderRadius: 8,
                            objectFit: 'cover',
                            maxWidth: '100%',
                            maxHeight: 120,
                          }}
                        />
                        <Button
                          variant='danger'
                          size='sm'
                          className='position-absolute top-0 end-0'
                          onClick={handleFileDelete}
                          style={{ margin: '2px' }}
                        >
                          ×
                        </Button>
                      </div>
                    );
                  } else if (fileInfo) {
                    return (
                      <div
                        className={styles.fileInfoContainer}
                        style={{ position: 'relative', textAlign: 'center' }}
                      >
                        {React.createElement(getFileIcon(), { size: 48, color: '#4A5568' })}
                        <div className='mt-2'>
                          <small>{fileInfo.name}</small>
                          <br />
                          <small className='text-muted'>{formatFileSize(fileInfo.size)}</small>
                        </div>
                        <Button
                          variant='danger'
                          size='sm'
                          className='position-absolute top-0 end-0'
                          onClick={handleFileDelete}
                          style={{ margin: '2px' }}
                        >
                          ×
                        </Button>
                      </div>
                    );
                  } else {
                    return (
                      <div className={styles.uploadPrompt}>
                        <FaUpload size={24} color='#6c757d' />
                        <div className='mt-2 text-muted small'>
                          Arrastra un archivo aquí
                          <br />o haz clic para seleccionar
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>

              {fileError && (
                <Alert variant='danger' className='mt-2' style={{ fontSize: '0.8rem' }}>
                  {fileError}
                </Alert>
              )}

              <Form.Control
                type='file'
                ref={fileInputRef}
                name='file'
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept='image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'
              />
            </div>
            <small className='text-muted d-block mt-1'>
              Imágenes, videos, audio, documentos
              <br />
              Tamaño máximo: 10MB
            </small>
          </Col>
        </Row>

        <Row>
          <Col sm={4}>
            <Form.Group>
              <Form.Label>Orden de Envío</Form.Label>
              <Select
                options={orderOptions}
                name='order'
                value={orderOptions.find(option => option.value === (messageData.order || 1))}
                onChange={selectedOption => {
                  const newOrder = selectedOption?.value || 1;
                  setMessageData({ ...messageData, order: newOrder });
                  handleInputChange({ target: { name: 'order', value: newOrder } });
                }}
              />
            </Form.Group>
          </Col>

          <Col sm={8} className='d-flex align-items-end'>
            <Form.Check
              type='switch'
              id='active-switch'
              label='Mensaje activo'
              checked={messageData.active}
              onChange={e => {
                setMessageData({ ...messageData, active: e.target.checked });
                handleInputChange({ target: { name: 'active', value: e.target.checked } });
              }}
            />
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer>
        <Button variant='secondary' onClick={handleClose} className={styles.modalButton}>
          Cancelar
        </Button>
        <Button
          variant='primary'
          onClick={handleSave}
          className={styles.modalButton}
          disabled={!messageData.content?.trim()}
        >
          {isEditing ? 'Guardar Cambios' : 'Crear Mensaje'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MessageModal;
