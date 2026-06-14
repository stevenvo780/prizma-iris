import React, { useState, useEffect, FC } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import Select from 'react-select';
import styles from '../../styles/Messages.module.css';
import { withAuthSync } from '../../utils/auth';
import useMessages from '../../store/messages';
import useUI from '@/store/ui';
import useUser from '@/store/user';
import MessageModalNew from './MessageModalNew';
import DeleteMessageModal from '@components/DeleteMessageModal';
import { WppMS } from '../../utils/types';
import MessageListItem from '@components/MessageListItem';
import api from '@/api';
import MessageDetailModal from '@components/MessageDetailModal';

type InputChangeEvent = {
  target: {
    name: string;
    value: string | File | null;
  };
};

const Messages: FC = () => {
  const { setLoading, addAlert } = useUI();
  const { getActiveWhatsappAccount } = useUser();
  const {
    messages,
    labels,
    fetchMessages,
    fetchLabels,
    createMessage,
    deleteMessage,
    scheduleMessages,
    uploadImage,
    updateMessage,
  } = useMessages();

  const [showModal, setShowModal] = useState(false);
  const [label, setLabel] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<WppMS>({
    content: '',
    mediaAttachments: '',
    active: true,
    messageType: 'text',
    mediaType: null,
    order: 1,
  });
  const [file, setFile] = useState<File | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);

  const [modalMessage, setModalMessage] = useState<WppMS | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<WppMS | null>(null);

  useEffect(() => {
    fetchMessages();
    fetchLabels();
    // eslint-disable-next-line
  }, []);

  const handleSelectChange = (event: any) => {
    const labelsData: string[] = [];
    for (let index = 0; index < event.length; index++) {
      const labelValue = event[index].value;
      labelsData.push(labelValue);
    }
    setLabel(labelsData);
  };

  const handleInputChange = (e: InputChangeEvent) => {
    if (e.target.name === 'file') {
      const file = e.target.value as File | null;
      if (file) {
        setFile(file);
        if (file.type.startsWith('image/')) {
          const localUrl = URL.createObjectURL(file);
          setLocalImageUrl(localUrl);
        }
      } else {
        setFile(null);
        setLocalImageUrl(null);
        setCurrentMessage({ ...currentMessage, mediaAttachments: '' });
      }
    } else {
      setCurrentMessage({ ...currentMessage, [e.target.name]: e.target.value });
    }
  };

  const createNewMessage = async () => {
    try {
      setLoading(true);
      if (file) {
        const fileUrl = await uploadImage(file);
        await createMessage({ ...currentMessage, mediaAttachments: fileUrl });
      } else {
        await createMessage(currentMessage);
      }
    } catch (err) {
      console.error('Error al crear mensaje:', err);
      addAlert({ type: 'danger', message: 'Error al crear el mensaje' });
    } finally {
      setLoading(false);
      resetForm();
    }
  };

  const createNewMessageFromModal = async (message: WppMS) => {
    try {
      setLoading(true);
      if (file) {
        const fileUrl = await uploadImage(file);
        await createMessage({ ...message, mediaAttachments: fileUrl });
      } else {
        await createMessage(message);
      }
    } catch (err) {
      console.error('Error al crear mensaje:', err);
      addAlert({ type: 'danger', message: 'Error al crear el mensaje' });
    } finally {
      setLoading(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setCurrentMessage({
      content: '',
      mediaAttachments: '',
      active: true,
      messageType: 'text',
      mediaType: null,
      order: messages.length + 1,
    });
    setLocalImageUrl(null);
    setFile(null);
    setShowModal(false);
  };

  const handleView = (message: WppMS) => {
    setModalMessage(message);
    setShowDetailModal(true);
  };

  const handleDelete = (messageId: string | number) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setMessageToDelete(message);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (messageToDelete) {
      await deleteMessage(messageToDelete.id!);
      setShowDeleteModal(false);
      setMessageToDelete(null);
    }
  };

  const handleToggleActive = (messageId: string | number, active: boolean) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      updateMessage(messageId, { active });
    }
  };

  const initializeNewMessage = () => {
    setCurrentMessage({
      content: '',
      mediaAttachments: '',
      active: true,
      messageType: 'text',
      mediaType: null,
      order: messages.length + 1,
    });
    setLocalImageUrl(null);
    setFile(null);
    setShowModal(true);
  };

  const handleScheduleMessages = async (labelList: string[]) => {
    try {
      if (!labelList.length) {
        addAlert({ type: 'warning', message: 'Debe seleccionar al menos una etiqueta' });
        return;
      }
      setLoading(true);
      await scheduleMessages(labelList);
    } catch (err) {
      console.error('Error al programar mensajes:', err);
      addAlert({ type: 'danger', message: 'Error al programar mensajes' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Container className={styles.container}>
        <Row>
          <Col sm='2'>
            <h2>Mensajes</h2>
          </Col>
          <Col sm={isEnabled && remainingMessages > 0 ? 5 : 8} style={{ marginTop: 10 }}>
            <Select
              placeholder='Etiquetas para programar mensajes'
              isMulti
              instanceId='labels'
              onChange={handleSelectChange}
              options={labels}
              value={label.map(label => ({ value: label, label }))}
            />
          </Col>
          <Col sm='2'>
            <Button
              variant='warning'
              onClick={() => handleScheduleMessages(label)}
              style={{ marginTop: 10 }}
              className={styles.actionButton}
            >
              Programar
            </Button>
          </Col>
          {isEnabled && remainingMessages > 0 && (
            <>
              <Col sm='1'>
                <Button
                  variant='secondary'
                  disabled
                  style={{ marginTop: 10 }}
                  className={styles.actionButton}
                >
                  Parar
                </Button>
              </Col>
              <Col sm='2' className='text-center'>
                Mensajes restantes {remainingMessages}
              </Col>
            </>
          )}
          <Col style={{ marginTop: 10 }} sm='12'>
            Cuando programes un mensaje, debes esperar a que acabe el proceso para poder programar
            otra etiqueta.
          </Col>
        </Row>
        <hr />
        <Row>
          <Col sm='8'>
            <Button
              variant='warning'
              onClick={initializeNewMessage}
              style={{ marginTop: 10 }}
              className={styles.actionButton}
            >
              Crear Nuevo Mensaje
            </Button>
          </Col>
        </Row>
        <br />
        <Row>
          {messages.length === 0 ? (
            <Col sm='12' className='text-center' style={{ marginTop: 40, color: '#888' }}>
              <p>No hay mensajes creados aún.</p>
            </Col>
          ) : (
            <Row className='g-4'>
              {messages.map(msg => (
                <Col key={msg.id} xs={1} sm={6} md={6} lg={6} xl={6}>
                  <MessageListItem
                    message={msg}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    onView={handleView}
                    onEdit={() => {}}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Row>

        {modalMessage && showDetailModal && (
          <MessageDetailModal
            show={showDetailModal}
            handleClose={() => setShowDetailModal(false)}
            message={modalMessage}
          />
        )}

        {messageToDelete && (
          <DeleteMessageModal
            show={showDeleteModal}
            onHide={() => setShowDeleteModal(false)}
            templateName={undefined}
            onConfirm={confirmDelete}
          />
        )}
      </Container>
      <MessageModalNew
        show={showModal}
        handleClose={() => setShowModal(false)}
        currentMessage={currentMessage}
        handleInputChange={handleInputChange}
        localImageUrl={localImageUrl}
        setLocalImageUrl={setLocalImageUrl}
        labels={labels}
        messagesLength={messages.length}
        onSaveMessage={createNewMessageFromModal}
      />
    </>
  );
};

export default withAuthSync(Messages);
