import React, { useState, useEffect, FC, useMemo } from 'react';
import SeoHead from '@components/SeoHead';
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
import { withAuthSync } from '@utils/auth';
import useUI from '@store/ui';
import useUser from '@store/user';
import { Templates } from '@utils/types';
import api from '@/api';
import styles from '@styles/Messages.module.css';
import {
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaExclamationTriangle,
  FaPlus,
  FaTrash,
  FaEye,
  FaInfoCircle,
  FaPaperPlane,
  FaSync,
} from 'react-icons/fa';
import VariableButtons from '@components/VariableButtons';
import { getWhatsappPreview, getTemplateDisplayText } from '@utils/variablePreview';
import { useActiveWhatsappAccount } from '@/hooks/useActiveWhatsappAccount';

const TemplatesPage: FC = () => {
  const { setLoading, addAlert } = useUI();
  const { getActiveWhatsappAccount } = useUser();
  const {
    activeAccount,
    loading: accountLoading,
    error: accountError,
    hasActiveAccount,
  } = useActiveWhatsappAccount();
  const [templates, setTemplates] = useState<Templates[]>([]);
  const [labels, setLabels] = useState<{ value: string; label: string }[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
      console.log('🔍 Fetching labels for templates...');
      const response = await api.customers.getLabelsAPI();
      console.log('📦 Labels response:', response.data);
      const formattedLabels = response.data.map((label: string) => ({
        value: label,
        label: label,
      }));
      setLabels(formattedLabels);
      console.log('✅ Labels set in templates:', formattedLabels);
    } catch (error) {
      console.error('❌ Error fetching labels for templates:', error);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchLabels();

    const interval = setInterval(() => {
      fetchLabels();
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  const validateTemplateName = (name: string): string | null => {
    if (!name) return 'Nombre es requerido';
    const validPattern = /^[a-z0-9_]+$/;
    if (!validPattern.test(name)) {
      return 'El nombre solo puede contener letras minúsculas, números y guiones bajos';
    }
    if (name.length < 1 || name.length > 512) {
      return 'El nombre debe tener entre 1 y 512 caracteres';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const nameError = validateTemplateName(formData.name || '');
    if (nameError) errors.name = nameError;

    if (!formData.body?.trim()) {
      errors.body = 'El contenido del template es requerido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTemplate = async () => {
    if (!validateForm()) return;

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

  const handleDeleteTemplate = async (templateId: string) => {
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

  const handleSyncTemplateStatus = async (template: Templates) => {
    try {
      setLoading(true);
      const response = await api.templates.syncTemplateStatusAPI(template.id!);
      const updatedTemplate = response.data;

      if (updatedTemplate.status !== template.status) {
        addAlert({
          type: 'success',
          message: `Estado actualizado: ${template.status} → ${updatedTemplate.status}`
        });
      } else {
        addAlert({
          type: 'info',
          message: `Estado sin cambios: ${updatedTemplate.status}`
        });
      }

      await fetchTemplates();
    } catch (error: any) {
      console.error('Error syncing template status:', error);
      const errorMessage = error?.response?.data?.message || 'Error al consultar estado en WhatsApp';
      addAlert({ type: 'danger', message: errorMessage });
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

      const activeTemplate = templates.find(t => t.active);
      if (!activeTemplate) {
        addAlert({ type: 'warning', message: 'Debe tener un template activo para enviar' });
        return;
      }

      if (activeTemplate.status?.toUpperCase() !== 'APPROVED') {
        addAlert({
          type: 'warning',
          message: `El template "${activeTemplate.name}" está ${activeTemplate.status}. Debe estar APROBADO para enviar.`
        });
        return;
      }

      setLoading(true);

      const response = await api.messages.scheduleMessagesAPI(labelList);

      console.log('Template enviado:', response);
      addAlert({ type: 'success', message: 'Templates de opt-in enviados exitosamente' });

      setSelectedLabels([]);
    } catch (err: any) {
      console.error('Error al programar templates:', err);
      console.error('Respuesta del servidor:', err?.response?.data);

      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Error al programar templates';

      if (errorMessage.includes('No se encontraron clientes')) {
        addAlert({
          type: 'warning',
          message: `${errorMessage}. Asegúrate de tener clientes con las etiquetas seleccionadas.`
        });
      } else if (errorMessage.includes('template activo y aprobado')) {
        addAlert({
          type: 'warning',
          message: 'No hay un template aprobado. El template debe estar activo y con estado APROBADO.'
        });
      } else if (errorMessage.includes('cuenta de WhatsApp activa')) {
        addAlert({
          type: 'warning',
          message: 'No hay cuenta de WhatsApp activa configurada. Ve a Cuentas de WhatsApp.'
        });
      } else {
        addAlert({ type: 'danger', message: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {

    const normalizedStatus = status?.toUpperCase();

    switch (normalizedStatus) {
      case 'APPROVED':
        return { variant: 'success', icon: <FaCheckCircle />, text: 'Aprobado' };
      case 'PENDING':
        return { variant: 'warning', icon: <FaClock />, text: 'Pendiente' };
      case 'REJECTED':
        return { variant: 'danger', icon: <FaTimes />, text: 'Rechazado' };
      case 'DRAFT':
        return { variant: 'secondary', icon: <FaExclamationTriangle />, text: 'Borrador' };
      case 'DISABLED':
        return { variant: 'danger', icon: <FaTimes />, text: 'Deshabilitado' };
      case 'NO_ACCOUNT':
        return { variant: 'secondary', icon: <FaExclamationTriangle />, text: 'Sin cuenta' };
      case 'INVALID_CREDENTIALS':
        return { variant: 'danger', icon: <FaTimes />, text: 'Credenciales inválidas' };
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

  const filteredTemplates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return templates;
    }

    return templates.filter(template => {
      return (
        template.name?.toLowerCase().includes(query) ||
        template.body?.toLowerCase().includes(query) ||
        template.category?.toLowerCase().includes(query) ||
        template.language?.toLowerCase().includes(query) ||
        template.status?.toLowerCase().includes(query)
      );
    });
  }, [templates, searchTerm]);

  return (
    <>
      <SeoHead title="Templates" description="Crea y gestiona plantillas de mensajes aprobadas por Meta para tus campañas de WhatsApp en Iris." pathname="/templates" noIndex />
      <Container className={styles.container}>
      <Row className='mb-4'>
        <Col>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0 }}>Templates</h2>
            <OverlayTrigger
              placement='right'
              trigger={['hover', 'focus']}
              overlay={
                <Tooltip id='templates-tooltip'>
                  <strong>Flujo de templates:</strong>
                  <br />
                  <br />
                  1. Crea el template con el texto deseado
                  <br />
                  2. Envíalo a WhatsApp (Meta) para aprobación
                  <br />
                  3. Meta lo revisa y aprueba/rechaza automáticamente vía webhook
                  <br />
                  4. Una vez aprobado, puedes usarlo para envíos masivos
                </Tooltip>
              }
              container={null}
            >
              <span
                tabIndex={0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(108, 117, 125, 0.1)'
                }}
              >
                <FaInfoCircle style={{ fontSize: '1rem', color: '#6c757d' }} />
              </span>
            </OverlayTrigger>
          </div>
        </Col>
      </Row>

      {!accountLoading && !hasActiveAccount && (
        <Alert variant='warning' className='mb-4'>
          <Alert.Heading>⚠️ Cuenta de WhatsApp no configurada</Alert.Heading>
          <p>
            Para crear templates automáticamente en WhatsApp Business API, necesitas configurar una
            cuenta activa.
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
      )}

      <Row className='mb-4 g-3 align-items-center'>
        <Col xs={12} md='auto'>
          <Button variant='primary' onClick={openCreateModal} className={styles.actionButton}>
            <FaPlus className='me-2' />
            Crear Nuevo Template
          </Button>
        </Col>
        <Col xs={12} md={6} lg={4} className='ms-md-auto'>
          <Form.Control
            type='search'
            placeholder='Buscar templates por nombre, estado o idioma'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label='Buscar templates'
          />
        </Col>
      </Row>
      <hr />

      <Row>
        {templates.length === 0 ? (
          <Col className='text-center' style={{ marginTop: 40, color: '#888' }}>
            <p>No hay templates creados aún.</p>
          </Col>
        ) : filteredTemplates.length === 0 ? (
          <Col className='text-center' style={{ marginTop: 40, color: '#888' }}>
            <p>
              No encontramos templates que coincidan con &quot;{searchTerm.trim()}&quot;
            </p>
            {searchTerm && (
              <Button variant='link' onClick={() => setSearchTerm('')}>
                Limpiar búsqueda
              </Button>
            )}
          </Col>
        ) : (
          filteredTemplates.map(template => {
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
                        <OverlayTrigger
                          placement='top'
                          overlay={<Tooltip id={`sync-tooltip-${template.id}`}>Actualizar estado desde WhatsApp</Tooltip>}
                        >
                          <Button
                            variant='outline-secondary'
                            size='sm'
                            onClick={() => handleSyncTemplateStatus(template)}
                            className='me-1'
                          >
                            <FaSync />
                          </Button>
                        </OverlayTrigger>
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
                      setFormData({ ...formData, language: e.target.value as 'es' | 'en' })
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
                        category: e.target.value as 'MARKETING' | 'UTILITY',
                      })
                    }
                  >
                    <option value='MARKETING'>Marketing</option>
                    <option value='UTILITY'>Utilidad</option>
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
          {selectedTemplate && (
            <>
              {(selectedTemplate.status?.toUpperCase() === 'DRAFT' ||
                selectedTemplate.status?.toUpperCase() === 'REJECTED') && (
                <Button
                  variant='success'
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await api.templates.submitTemplateForApprovalAPI(selectedTemplate.id!);
                      addAlert({ type: 'success', message: 'Template enviado a WhatsApp para aprobación. La respuesta llegará automáticamente por webhook.' });
                      await fetchTemplates();
                      setShowDetailModal(false);
                    } catch (error: any) {
                      const errorMessage = error?.response?.data?.message || 'Error al enviar template a WhatsApp';
                      addAlert({ type: 'danger', message: errorMessage });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <FaPaperPlane className='me-1' /> Enviar a WhatsApp
                </Button>
              )}

              {selectedTemplate.status?.toUpperCase() === 'PENDING' && (
                <Button
                  variant='outline-info'
                  onClick={() => handleSyncTemplateStatus(selectedTemplate)}
                >
                  <FaSync className='me-1' /> Consultar Estado
                </Button>
              )}
            </>
          )}
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
    </>
  );
};

export default withAuthSync(TemplatesPage);

export async function getServerSideProps(context: any) {
  return { props: {} };
}
