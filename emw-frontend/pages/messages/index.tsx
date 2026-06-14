import React, { useState, useEffect, FC, useCallback, useMemo } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import Select from 'react-select';
import styles from '@styles/Messages.module.css';
import { withAuthSync } from '@utils/auth';
import useMessages from '@store/messages';
import useUI from '@store/ui';
import useUser from '@store/user';
import { useActiveWhatsappAccount } from '@/hooks/useActiveWhatsappAccount';
import MessageModalNew from './MessageModalNew';
import DeleteMessageModal from '@components/DeleteMessageModal';
import { WppMS } from '@utils/types';
import MessageListItem from '@components/MessageListItem';
import api from '@/api';
import MessageDetailModal from '@components/MessageDetailModal';
import BulkSendStatus from '@components/BulkSendStatus';
import MessageTracker from '@components/MessageTracker';
import { scheduleMessagesAPI } from '@/api/messages';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

type InputChangeEvent = {
  target: {
    name: string;
    value: string | File | null;
  };
};

/** Clasifica un archivo según su MIME type para WhatsApp Cloud API */
const getWhatsAppMediaType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

const Messages: FC = () => {
  const { setLoading, addAlert } = useUI();
  const { getActiveWhatsappAccount } = useUser();
  const {
    activeAccount,
    loading: accountLoading,
    error: accountError,
    hasActiveAccount,
  } = useActiveWhatsappAccount();
  const {
    messages,
    labels,
    fetchMessages,
    fetchLabels,
    sendMessage,
    deleteMessage,
    sendBulkMessages,
    uploadImage,
    updateMessage,
    retryMessage,
    cancelMessage,
    getMessageStats,
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
  const [editingMessage, setEditingMessage] = useState<WppMS | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [lastBulkSendResult, setLastBulkSendResult] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [trackedMessageIds, setTrackedMessageIds] = useState<string[]>([]);

  // Mensajes ordenados por campo order (nunca repite)
  const sortedMessages = useMemo(() => {
    if (!messages || !Array.isArray(messages)) return [];
    return [...messages].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [messages]);

  // IDs para el SortableContext
  const sortedIds = useMemo(
    () => sortedMessages.map(m => m.id!),
    [sortedMessages],
  );

  // Sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Handler de reorden tras soltar el drag
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedMessages.findIndex(m => m.id === active.id);
    const newIndex = sortedMessages.findIndex(m => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedMessages, oldIndex, newIndex);
    // Generar nuevos órdenes secuenciales (1, 2, 3...)
    const items = reordered.map((m, i) => ({ id: m.id!, order: i + 1 }));

    try {
      await api.messages.reorderMessagesAPI(items);
      fetchMessages();
    } catch (err) {
      console.error('Error al reordenar:', err);
      addAlert({ type: 'danger', message: 'Error al reordenar mensajes' });
    }
  }, [sortedMessages, fetchMessages, addAlert]);

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
      let mediaAttachments = undefined;

      if (file) {
        const fileUrl = await uploadImage(file);
        mediaAttachments = [{
          type: getWhatsAppMediaType(file.type),
          url: fileUrl,
          caption: currentMessage.content,
          filename: file.name,
        }];
      }

      await sendMessage({
        content: currentMessage.content,
        mediaAttachments,
        recipientNumber: 'draft',
      });

      addAlert({ type: 'success', message: 'Mensaje guardado como borrador' });
    } catch (err) {
      console.error('Error al crear mensaje:', err);
      addAlert({ type: 'danger', message: 'Error al crear el mensaje' });
    } finally {
      setLoading(false);
      resetForm();
      fetchMessages();
    }
  };

  const createNewMessageFromModal = async (message: WppMS) => {
    try {
      setLoading(true);

      if (isEditMode && editingMessage) {
        let updatedMessage = { ...message };
        if (file) {
          // Hay un archivo nuevo - subirlo
          const fileUrl = await uploadImage(file);
          updatedMessage = { ...updatedMessage, mediaAttachments: fileUrl };
        } else if (message.mediaAttachments === null) {
          // El archivo fue eliminado explícitamente - enviar null para limpiar
          updatedMessage = { ...updatedMessage, mediaAttachments: null, mediaType: null };
        }
        // Si message.mediaAttachments tiene valor y no hay file nuevo, se mantiene el existente
        await updateMessage(editingMessage.id!.toString(), updatedMessage);
        addAlert({ type: 'success', message: 'Mensaje actualizado con éxito' });
      } else {
        let mediaAttachments = undefined;

        if (file) {
          const fileUrl = await uploadImage(file);
          mediaAttachments = [{
            type: getWhatsAppMediaType(file.type),
            url: fileUrl,
            caption: message.content,
            filename: file.name,
          }];
        } else if (message.mediaAttachments) {
          mediaAttachments = [{
            type: message.mediaType || 'image',
            url: message.mediaAttachments,
            caption: message.content
          }];
        }

        await sendMessage({
          content: message.content,
          mediaAttachments,
          recipientNumber: 'draft',
        });

        addAlert({ type: 'success', message: 'Mensaje guardado con éxito' });
      }
    } catch (err) {
      console.error('Error al procesar mensaje:', err);
      addAlert({
        type: 'danger',
        message: isEditMode ? 'Error al actualizar el mensaje' : 'Error al crear el mensaje',
      });
    } finally {
      setLoading(false);
      resetForm();
      fetchMessages();
    }
  };

  const resetForm = () => {
    setCurrentMessage({
      content: '',
      mediaAttachments: '',
      active: true,
      messageType: 'text',
      mediaType: null,
      order: sortedMessages.length + 1,
    });
    setLocalImageUrl(null);
    setFile(null);
    setShowModal(false);
    setEditingMessage(null);
    setIsEditMode(false);
  };

  const handleView = (message: WppMS) => {
    setModalMessage(message);
    setShowDetailModal(true);
  };

  const handleDelete = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setMessageToDelete(message);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (messageToDelete) {
      await deleteMessage(messageToDelete.id!.toString());
      setShowDeleteModal(false);
      setMessageToDelete(null);
      fetchMessages();
    }
  };

  const handleToggleActive = (messageId: string, active: boolean) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      updateMessage(messageId, { ...message, active });
    }
  };

  const handleEdit = (message: WppMS) => {
    setCurrentMessage(message);
    setEditingMessage(message);
    setIsEditMode(true);
    // mediaAttachments puede ser un array de objetos o una string (legacy)
    const mediaUrl = Array.isArray(message.mediaAttachments)
      ? message.mediaAttachments[0]?.url
      : message.mediaAttachments;
    setLocalImageUrl(mediaUrl || null);
    setShowModal(true);
  };

  const initializeNewMessage = () => {
    setCurrentMessage({
      content: '',
      mediaAttachments: '',
      active: true,
      messageType: 'text',
      mediaType: null,
      order: sortedMessages.length + 1,
    });
    setLocalImageUrl(null);
    setFile(null);
    setEditingMessage(null);
    setIsEditMode(false);
    setShowModal(true);
  };

  const handleScheduleMessages = async (labelList: string[]) => {
    try {
      if (!labelList.length) {
        addAlert({ type: 'warning', message: 'Debe seleccionar al menos una etiqueta' });
        return;
      }
      setIsSending(true);
      setLoading(true);

      const activeMessages = messages.filter(msg => msg.active);
      if (activeMessages.length === 0) {
        addAlert({ type: 'warning', message: 'No hay mensajes activos para enviar' });
        setLoading(false);
        setIsSending(false);
        return;
      }

      const messageToSend = activeMessages[0];

      const bulkData = {
        customerTags: labelList,
        content: messageToSend.content,
        mediaAttachments: messageToSend.mediaAttachments ? [{
          type: messageToSend.mediaType || 'image',
          url: messageToSend.mediaAttachments,
          caption: messageToSend.content
        }] : undefined,
      };

      const response = await scheduleMessagesAPI(labelList);

      const stats = await getMessageStats();
      if (stats) {
        console.log('Estadísticas de mensajes:', stats);
      }

      setLabel([]);
    } catch (err) {
      console.error('Error al programar mensajes:', err);
      addAlert({ type: 'danger', message: 'Error al programar mensajes' });
    } finally {
      setLoading(false);
      setIsSending(false);
    }
  };

  return (
    <>
      <Container className={styles.container}>
        <Row>
          <Col>
            <h2>Mensajes</h2>
            <small className='text-muted'>
              Crea y gestiona los mensajes que se enviarán a tus clientes. Usa el selector de etiquetas en la barra superior para programar envíos masivos.
            </small>
          </Col>
        </Row>

        {!accountLoading && !hasActiveAccount && (
          <Row className='mb-3'>
            <Col>
              <Alert variant='warning'>
                <Alert.Heading>⚠️ Cuenta de WhatsApp no configurada</Alert.Heading>
                <p>
                  Para enviar mensajes, necesitas configurar una cuenta activa de WhatsApp Business
                  API.
                  <br />
                  Ve a <strong>Cuentas de WhatsApp</strong> para configurar tus credenciales.
                </p>
                {accountError && (
                  <details className='mt-2'>
                    <summary className='text-muted' style={{ cursor: 'pointer' }}>
                      <small>Mostrar detalles técnicos</small>
                    </summary>
                    <pre className='mt-2 p-2 bg-light text-dark small'>{accountError}</pre>
                  </details>
                )}
              </Alert>
            </Col>
          </Row>
        )}

        <BulkSendStatus
          isLoading={isSending}
          lastSendResult={lastBulkSendResult}
        />

        {showTracker && (
          <MessageTracker
            messageIds={trackedMessageIds}
            refreshInterval={5000}
            onClose={() => setShowTracker(false)}
          />
        )}
        <hr />
        <Row>
          <Col xs={12}>
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
          {!messages || !Array.isArray(messages) || messages.length === 0 ? (
            <Col sm='12' className='text-center' style={{ marginTop: 40, color: '#888' }}>
              <p>No hay mensajes creados aún.</p>
            </Col>
          ) : (
            <Col xs={12}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
                  {sortedMessages.map((msg, index) => (
                    <MessageListItem
                      key={msg.id}
                      message={msg}
                      index={index + 1}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                      onView={handleView}
                      onEdit={handleEdit}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </Col>
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
