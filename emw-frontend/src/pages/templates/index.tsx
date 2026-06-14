import React, { useState, useEffect, FC, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Alert,
  Card,
  Badge,
  Modal,
  Form,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import Select from 'react-select';
import { withAuthSync } from '../../utils/auth';
import useUI from '@/store/ui';
import useUser from '@/store/user';
import { Templates } from '../../utils/types';
import api from '@/api';
import styles from '../../styles/Messages.module.css';
import {
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaExclamationTriangle,
  FaPlus,
  FaTrash,
  FaEye,
  FaInfoCircle,
} from 'react-icons/fa';
import VariableButtons from '@/components/VariableButtons';
import { getWhatsappPreview, getTemplateDisplayText } from '@utils/variablePreview';

const TemplatesPage: FC = () => {
  const { setLoading, addAlert } = useUI();
  const { getActiveWhatsappAccount } = useUser();
  const [templates, setTemplates] = useState<Templates[]>([]);
  const [labels, setLabels] = useState<{ value: string; label: string }[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Templates | null>(null);

  const [formData, setFormData] = useState<Partial<Templates>>({
    name: '',
    language: 'es',
    body: '',
    category: 'MARKETING',
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [previewText, setPreviewText] = useState<string>('');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.templates.getTemplatesAPI();
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      addAlert({ type: 'danger', message: 'Error al cargar las plantillas' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLabels = async () => {
    try {
      const response = await api.customers.getLabelsAPI();
      const formattedLabels = response.data.map((label: string) => ({
        value: label,
        label: label,
      }));
      setLabels(formattedLabels);
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchLabels();
    // eslint-disable-next-line
  }, []);

  const validateTemplateName = (name: string): string | null => {
    if (!name) return 'Nombre es requerido';
    const validPattern = /^[a-z0-9_]+$/;
    if (!validPattern.test(name)) {
      return 'Solo se permiten letras minúsculas, números y guiones bajos';
    }
    if (name.length < 3) return 'Mínimo 3 caracteres';
    if (name.length > 50) return 'Máximo 50 caracteres';
    return null;
  };

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    const nameError = validateTemplateName(formData.name || '');
    if (nameError) errors.name = nameError;

    if (!formData.body?.trim()) {
      errors.body = 'El contenido del template es requerido';
    }

    return errors;
  };

  const handleCreateTemplate = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setLoading(true);
      await api.templates.createTemplateAPI(formData as Templates);
      addAlert({ type: 'success', message: 'Template creado exitosamente' });

      setFormData({
        name: '',
        language: 'es',
        body: '',
        category: 'MARKETING',
        active: true,
      });
      setFormErrors({});
      setShowCreateModal(false);

      await fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      addAlert({ type: 'danger', message: 'Error al crear template' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      setLoading(true);
      await api.templates.deleteTemplateAPI(templateId);
      addAlert({ type: 'success', message: 'Template eliminado exitosamente' });
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      addAlert({ type: 'danger', message: 'Error al eliminar template' });
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setSelectedTemplate(null);
    }
  };

  const handleToggleActive = async (template: Templates) => {
    try {
      if (!template.active) {
        const currentActiveTemplate = templates.find(t => t.active && t.id !== template.id);
        if (currentActiveTemplate) {
          const confirmed = window.confirm(
            `¿Estás seguro que deseas activar "${template.name}"?\n\n` +
              `Esto desactivará automáticamente el template actual: "${currentActiveTemplate.name}"\n\n` +
              `Solo un template puede estar activo a la vez.`,
          );
          if (!confirmed) return;
        }
      }

      setLoading(true);
      await api.templates.updateTemplateAPI(template.id!, { active: !template.active });

      const actionText = !template.active ? 'activado' : 'desactivado';
      addAlert({ type: 'success', message: `Template ${actionText} exitosamente` });

      await fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      addAlert({ type: 'danger', message: 'Error al actualizar estado' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (selectedOptions: any) => {
    const labelsData: string[] = [];
    for (let index = 0; index < selectedOptions.length; index++) {
      const labelValue = selectedOptions[index].value;
      labelsData.push(labelValue);
    }
    setSelectedLabels(labelsData);
  };

  const handleScheduleTemplates = async (labelList: string[]) => {
    try {
      if (!labelList.length) {
        addAlert({ type: 'warning', message: 'Debe seleccionar al menos una etiqueta' });
        return;
      }
      setLoading(true);

      addAlert({ type: 'success', message: 'Templates de opt-in programados exitosamente' });
    } catch (err) {
      console.error('Error al programar templates:', err);
      addAlert({ type: 'danger', message: 'Error al programar templates' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { variant: 'success', icon: <FaCheckCircle />, text: 'Aprobado' };
      case 'pending':
        return { variant: 'warning', icon: <FaClock />, text: 'Pendiente' };
      case 'rejected':
        return { variant: 'danger', icon: <FaTimes />, text: 'Rechazado' };
      case 'draft':
        return { variant: 'secondary', icon: <FaExclamationTriangle />, text: 'Borrador' };
      case 'disabled':
        return { variant: 'danger', icon: <FaTimes />, text: 'Deshabilitado' };
      default:
        return { variant: 'secondary', icon: <FaClock />, text: status || 'Desconocido' };
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      language: 'es',
      body: '',
      category: 'MARKETING',
      active: true,
    });
    setFormErrors({});
    setPreviewText('');
    setShowCreateModal(true);
  };

  const openDetailModal = (template: Templates) => {
    setSelectedTemplate(template);
    setShowDetailModal(true);
  };

  const openDeleteModal = (template: Templates) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };

  useEffect(() => {
    setPreviewText(getWhatsappPreview(formData.body || ''));
  }, [formData.body]);

  const handleVariableInsert = (variable: string) => {
    const newBody = (formData.body || '') + variable;
    setFormData({ ...formData, body: newBody });
  };

  return (
    <Container className={styles.container}>
      <Row className='mb-4'>
        <Col>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0 }}>Templates</h2>
            <OverlayTrigger
              placement='auto'
              trigger={['hover', 'focus']}
              overlay={
                <Tooltip id='templates-tooltip'>
                  Los templates son mensajes de texto simple que se envían para solicitar
                  autorización del usuario.
                  <br />
                  Una vez que el usuario responde, se pueden enviar mensajes con contenido
                  multimedia.
                </Tooltip>
              }
              container={null}
            >
              <span
                tabIndex={0}
                style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
              >
                <FaInfoCircle className='text-muted' style={{ fontSize: '1.1rem' }} />
              </span>
            </OverlayTrigger>
          </div>
        </Col>
      </Row>

      {!getActiveWhatsappAccount() && (
        <Alert variant='warning' className='mb-4'>
          <Alert.Heading>⚠️ Cuenta de WhatsApp no configurada</Alert.Heading>
          <p>
            Para crear templates automáticamente en WhatsApp Business API, necesitas configurar una
            cuenta activa.
            <br />
            Ve a <strong>Cuentas de WhatsApp</strong> para configurar tus credenciales.
          </p>
        </Alert>
      )}

      <Row className='mb-4'>
        <Col sm='2'>
          <h4>Programar</h4>
        </Col>
        <Col sm={isEnabled && remainingMessages > 0 ? 5 : 8} style={{ marginTop: 10 }}>
          <Select
            placeholder='Etiquetas para programar templates'
            isMulti
            instanceId='labels-templates'
            onChange={handleSelectChange}
            options={labels}
            value={selectedLabels.map(label => ({ value: label, label }))}
          />
        </Col>
        <Col sm='2'>
          <Button
            variant='warning'
            onClick={() => handleScheduleTemplates(selectedLabels)}
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
              Templates restantes {remainingMessages}
            </Col>
          </>
        )}
        <Col style={{ marginTop: 10 }} sm='12'>
          <small className='text-muted'>
            Los templates se envían para solicitar autorización. Una vez que el usuario responde,
            podrás enviar mensajes desde la sección de Mensajes.
          </small>
        </Col>
      </Row>
      <hr />

      <Row className='mb-4'>
        <Col>
          <Button variant='primary' onClick={openCreateModal} className={styles.actionButton}>
            <FaPlus className='me-2' />
            Crear Nuevo Template
          </Button>
        </Col>
      </Row>

      <Row>
        {templates.length === 0 ? (
          <Col className='text-center' style={{ marginTop: 40, color: '#888' }}>
            <p>No hay templates creados aún.</p>
          </Col>
        ) : (
          templates.map(template => {
            const statusConfig = getStatusConfig(template.status || '');
            return (
              <Col key={template.id} xs={12} sm={6} md={4} lg={3} className='mb-3'>
                <Card className='h-100' style={{ position: 'relative' }}>
                  <Card.Body className='d-flex flex-column'>
                    <div className='d-flex justify-content-between align-items-start mb-2'>
                      <Card.Title className='mb-1 text-truncate' style={{ fontSize: '1rem' }}>
                        {template.name}
                      </Card.Title>
                      <Badge bg={statusConfig.variant} className='ms-2'>
                        {statusConfig.icon} {statusConfig.text}
                      </Badge>
                    </div>

                    <Card.Text className='small text-muted mb-2'>
                      <strong>Idioma:</strong> {template.language}
                      <br />
                      <strong>Categoría:</strong> {template.category}
                    </Card.Text>

                    <Card.Text className='flex-grow-1' style={{ fontSize: '0.9rem' }}>
                      {(() => {
                        const { descriptiveText } = getTemplateDisplayText(
                          template.body || '',
                          null,
                        );
                        return descriptiveText.length > 100
                          ? `${descriptiveText.substring(0, 100)}...`
                          : descriptiveText;
                      })()}
                    </Card.Text>

                    <div className='d-flex justify-content-between align-items-center mt-auto'>
                      <Form.Check
                        type='switch'
                        id={`active-${template.id}`}
                        label={template.active ? 'Activo' : 'Inactivo'}
                        checked={template.active}
                        onChange={() => handleToggleActive(template)}
                        className='small'
                        style={{
                          fontSize: '0.8rem',
                          color: template.active ? '#28a745' : '#6c757d',
                          fontWeight: template.active ? 'bold' : 'normal',
                        }}
                      />

                      <div>
                        <Button
                          variant='outline-primary'
                          size='sm'
                          onClick={() => openDetailModal(template)}
                          className='me-1'
                        >
                          <FaEye />
                        </Button>
                        <Button
                          variant='outline-danger'
                          size='sm'
                          onClick={() => openDeleteModal(template)}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })
        )}
      </Row>

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size='lg'>
        <Modal.Header closeButton>
          <Modal.Title>Crear Nuevo Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className='mb-3'>
                  <Form.Label>Nombre del Template *</Form.Label>
                  <Form.Control
                    type='text'
                    placeholder='ej: solicitud_autorizacion'
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    isInvalid={!!formErrors.name}
                  />
                  <Form.Control.Feedback type='invalid'>{formErrors.name}</Form.Control.Feedback>
                  <Form.Text className='text-muted'>
                    Solo letras minúsculas, números y guiones bajos
                  </Form.Text>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className='mb-3'>
                  <Form.Label>Idioma</Form.Label>
                  <Form.Select
                    value={formData.language || 'es'}
                    onChange={e =>
                      setFormData({ ...formData, language: e.target.value as 'es' | 'en' | 'pt' })
                    }
                  >
                    <option value='es'>Español</option>
                    <option value='en'>Inglés</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className='mb-3'>
                  <Form.Label>Categoría</Form.Label>
                  <Form.Select
                    value={formData.category || 'MARKETING'}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        category: e.target.value as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
                      })
                    }
                  >
                    <option value='MARKETING'>Marketing</option>
                    <option value='UTILITY'>Utilidad</option>
                    <option value='AUTHENTICATION'>Autenticación</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className='mb-3'>
              <Form.Label>Contenido del Template *</Form.Label>
              <Form.Control
                as='textarea'
                rows={6}
                placeholder='Ej: Hola, ¿te gustaría recibir ofertas especiales de nuestra tienda? Responde SÍ para continuar.'
                value={formData.body || ''}
                onChange={e => setFormData({ ...formData, body: e.target.value })}
                isInvalid={!!formErrors.body}
              />
              <Form.Control.Feedback type='invalid'>{formErrors.body}</Form.Control.Feedback>
              <Form.Text className='text-muted'>
                Solo texto simple, sin imágenes ni archivos.
              </Form.Text>
            </Form.Group>

            <div className='mb-3'>
              <VariableButtons onVariableInsert={handleVariableInsert} />
            </div>

            {formData.body && (
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

            <Form.Group>
              <Form.Check
                type='switch'
                id='template-active'
                label='Template activo'
                checked={formData.active || false}
                onChange={e => setFormData({ ...formData, active: e.target.checked })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowCreateModal(false)}>
            Cancelar
          </Button>
          <Button variant='primary' onClick={handleCreateTemplate}>
            Crear Template
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size='lg'>
        <Modal.Header closeButton>
          <Modal.Title>Detalle del Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTemplate && (
            <div>
              <Row className='mb-3'>
                <Col md={6}>
                  <strong>Nombre:</strong> {selectedTemplate.name}
                </Col>
                <Col md={3}>
                  <strong>Idioma:</strong> {selectedTemplate.language}
                </Col>
                <Col md={3}>
                  <strong>Categoría:</strong> {selectedTemplate.category}
                </Col>
              </Row>

              <Row className='mb-3'>
                <Col md={6}>
                  <strong>Estado:</strong>{' '}
                  <Badge bg={getStatusConfig(selectedTemplate.status || '').variant}>
                    {getStatusConfig(selectedTemplate.status || '').text}
                  </Badge>
                </Col>
                <Col md={6}>
                  <strong>Activo:</strong> {selectedTemplate.active ? 'Sí' : 'No'}
                </Col>
              </Row>

              <div className='mb-3'>
                <strong>Contenido:</strong>
                <div className='mt-2'>
                  {(() => {
                    const { descriptiveText, previewText } = getTemplateDisplayText(
                      selectedTemplate.body || '',
                      null,
                    );
                    return (
                      <>
                        <div className='p-3 bg-light rounded mb-2'>
                          <strong>Variables descriptivas:</strong>
                          <div style={{ fontFamily: 'monospace', marginTop: '8px' }}>
                            {descriptiveText}
                          </div>
                        </div>
                        <div className='p-3 bg-info bg-opacity-10 rounded'>
                          <strong>Vista previa con valores de ejemplo:</strong>
                          <div style={{ fontFamily: 'monospace', marginTop: '8px' }}>
                            {previewText}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {selectedTemplate.rejectionReason && (
                <Alert variant='danger'>
                  <strong>Razón de rechazo:</strong> {selectedTemplate.rejectionReason.message}
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowDetailModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            ¿Estás seguro que deseas eliminar el template <strong>{selectedTemplate?.name}</strong>?
          </p>
          <p className='text-muted'>Esta acción no se puede deshacer.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button
            variant='danger'
            onClick={() => selectedTemplate && handleDeleteTemplate(selectedTemplate.id!)}
          >
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default withAuthSync(TemplatesPage);
