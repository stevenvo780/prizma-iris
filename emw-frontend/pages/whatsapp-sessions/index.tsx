import { FC, useEffect, useState } from 'react';
import SeoHead from '@components/SeoHead';
import { Container, Row, Col, Card, Spinner, Alert, Button, Form, Modal, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { withAuthSync } from '@utils/auth';
import useUI from '@/store/ui';
import useUser from '@/store/user';
import {
  createWppAccount,
  getWppAccounts,
  deleteWppAccount,
  updateWppAccount,
} from '@/api/whatsapp';
import {
  FaWhatsapp,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaPhone,
  FaKey,
  FaIdBadge,
  FaBuilding,
  FaEye,
  FaEyeSlash,
  FaExclamationTriangle,
} from 'react-icons/fa';

interface WppAccount {
  id: string;
  name: string;
  phoneNumber: string;
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  isActive?: boolean;
  status?: string;
  type?: string;
  createdAt?: string;
}

const initialForm = {
  name: '',
  phoneNumber: '',
  phoneNumberId: '',
  accessToken: '',
  businessAccountId: '',
};

const WhatsAppAccountsPage: FC = () => {
  const { setLoading, addAlert } = useUI();
  const { setActiveWhatsappAccount, user } = useUser();
  const [accounts, setAccounts] = useState<WppAccount[]>([]);
  const [loading, setLoadingState] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(initialForm);

  // Token visibility
  const [visibleTokens, setVisibleTokens] = useState<Record<string, boolean>>({});
  const [showEditToken, setShowEditToken] = useState(false);
  const [showCreateToken, setShowCreateToken] = useState(false);

  const fetchAccounts = async () => {
    setLoadingState(true);
    setError(null);
    try {
      const res = await getWppAccounts();
      setAccounts(res.data);
    } catch (err: any) {
      setError('Error al obtener cuentas de WhatsApp');
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    const activeAccount = accounts.find(acc => (acc as any).isActive === true);
    setActiveId(activeAccount ? activeAccount.id : null);
  }, [accounts, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phoneNumber.trim() || !form.phoneNumberId.trim() ||
      !form.accessToken.trim() || !form.businessAccountId.trim()) {
      addAlert({ type: 'warning', message: 'Todos los campos son requeridos' });
      return;
    }
    setFormLoading(true);
    setLoading(true);
    try {
      await createWppAccount(form);
      addAlert({ type: 'success', message: 'Cuenta creada correctamente' });
      setForm(initialForm);
      setShowCreateModal(false);
      fetchAccounts();
    } catch (err: any) {
      if (err?.response?.data?.message?.includes('already exists')) {
        addAlert({ type: 'warning', message: 'Ya existe una cuenta con este número de teléfono.' });
      } else if (err?.response?.data?.message) {
        addAlert({ type: 'danger', message: `Error: ${err.response.data.message}` });
      } else {
        addAlert({ type: 'danger', message: 'Error al crear la cuenta' });
      }
    } finally {
      setFormLoading(false);
      setLoading(false);
    }
  };

  const handleSelectActive = async (id: string) => {
    setActiveId(id);
    await setActiveWhatsappAccount(id);
    addAlert({ type: 'success', message: 'Cuenta activada correctamente' });
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteWppAccount(id);
      addAlert({ type: 'success', message: 'Cuenta eliminada' });
      setShowDeleteConfirm(null);
      fetchAccounts();
      if (activeId === id) setActiveId(null);
    } catch (err: any) {
      if (err?.response?.data?.message?.includes('violates foreign key constraint')) {
        addAlert({ type: 'warning', message: 'No se puede eliminar: tiene mensajes asociados.' });
      } else {
        addAlert({ type: 'danger', message: 'Error al eliminar la cuenta' });
      }
      setShowDeleteConfirm(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (acc: WppAccount) => {
    setEditId(acc.id);
    setEditForm({
      name: acc.name,
      phoneNumber: acc.phoneNumber,
      phoneNumberId: acc.phoneNumberId,
      accessToken: acc.accessToken,
      businessAccountId: acc.businessAccountId,
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    if (!editForm.name.trim() || !editForm.phoneNumber.trim() || !editForm.phoneNumberId.trim() ||
      !editForm.accessToken.trim() || !editForm.businessAccountId.trim()) {
      addAlert({ type: 'warning', message: 'Todos los campos son requeridos' });
      return;
    }
    setLoading(true);
    try {
      await updateWppAccount(editId, editForm);
      addAlert({ type: 'success', message: 'Cuenta actualizada' });
      setShowEditModal(false);
      setEditId(null);
      fetchAccounts();
    } catch (err) {
      addAlert({ type: 'danger', message: 'Error al actualizar la cuenta' });
    } finally {
      setLoading(false);
    }
  };

  const toggleTokenVisibility = (id: string) => {
    setVisibleTokens(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskToken = (token: string) => {
    if (!token) return 'No configurado';
    return '•••••••••••••' + token.slice(-8);
  };

  const renderFormFields = (
    values: typeof initialForm,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    tokenVisible: boolean,
    onToggleToken: () => void,
  ) => (
    <>
      <Form.Group className='mb-3'>
        <Form.Label className='fw-semibold'>
          <FaIdBadge className='me-2 text-muted' />
          Nombre de la cuenta
        </Form.Label>
        <Form.Control
          name='name'
          value={values.name}
          onChange={onChange}
          placeholder='Ej: Mi empresa WA'
          required
          autoComplete='off'
        />
      </Form.Group>
      <Row>
        <Col md={6}>
          <Form.Group className='mb-3'>
            <Form.Label className='fw-semibold'>
              <FaPhone className='me-2 text-muted' />
              Número (E.164)
            </Form.Label>
            <Form.Control
              name='phoneNumber'
              value={values.phoneNumber}
              onChange={onChange}
              placeholder='+573001234567'
              required
              autoComplete='off'
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className='mb-3'>
            <Form.Label className='fw-semibold'>
              <FaIdBadge className='me-2 text-muted' />
              Phone Number ID
            </Form.Label>
            <Form.Control
              name='phoneNumberId'
              value={values.phoneNumberId}
              onChange={onChange}
              placeholder='123456789012345'
              required
              autoComplete='off'
            />
          </Form.Group>
        </Col>
      </Row>
      <Form.Group className='mb-3'>
        <Form.Label className='fw-semibold'>
          <FaKey className='me-2 text-muted' />
          Access Token
        </Form.Label>
        <div className='position-relative'>
          <Form.Control
            name='accessToken'
            value={values.accessToken}
            onChange={onChange}
            placeholder='EAAxxxxxxx...'
            required
            type={tokenVisible ? 'text' : 'password'}
            autoComplete='new-password'
            style={{ paddingRight: '42px' }}
          />
          <Button
            variant='link'
            className='position-absolute p-0'
            style={{ right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }}
            onClick={onToggleToken}
            type='button'
          >
            {tokenVisible ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
          </Button>
        </div>
        <Form.Text className='text-muted'>
          Token de la API de WhatsApp Business. Se almacena de forma segura.
        </Form.Text>
      </Form.Group>
      <Form.Group className='mb-3'>
        <Form.Label className='fw-semibold'>
          <FaBuilding className='me-2 text-muted' />
          WABA ID
        </Form.Label>
        <Form.Control
          name='businessAccountId'
          value={values.businessAccountId}
          onChange={onChange}
          placeholder='123456789012345'
          required
          autoComplete='off'
        />
        <Form.Text className='text-muted'>
          ID de tu cuenta de WhatsApp Business (WABA).
        </Form.Text>
      </Form.Group>
    </>
  );

  return (
    <>
      <SeoHead title="WhatsApp Sessions" description="Gestiona tus cuentas de WhatsApp Business API, conecta sesiones y configura credenciales en Iris." pathname="/whatsapp-sessions" noIndex />
    <Container className='py-4'>
      {/* Header */}
      <div className='d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2'>
        <div>
          <h2 className='fw-bold mb-1' style={{ color: '#1a1a2e' }}>
            <FaWhatsapp className='me-2' style={{ color: '#25D366' }} />
            WhatsApp Business
          </h2>
          <p className='text-muted mb-0'>
            Administra tus cuentas de WhatsApp Business API
          </p>
        </div>
        <Button
          variant='success'
          onClick={() => setShowCreateModal(true)}
          className='d-flex align-items-center gap-2 px-4 py-2'
          style={{
            borderRadius: '10px',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
          }}
        >
          <FaPlus />
          Nueva cuenta
        </Button>
      </div>

      <hr style={{ borderColor: '#e0e0e0' }} />

      {/* Loading / Error / Empty */}
      {loading ? (
        <div className='text-center py-5'>
          <Spinner animation='border' variant='success' />
          <p className='text-muted mt-3'>Cargando cuentas...</p>
        </div>
      ) : error ? (
        <Alert variant='danger' className='text-center'>
          <FaExclamationTriangle className='me-2' />
          {error}
        </Alert>
      ) : accounts.length === 0 ? (
        <div className='text-center py-5'>
          <div style={{ fontSize: '4rem', opacity: 0.3 }}>
            <FaWhatsapp />
          </div>
          <h4 className='text-muted mt-3'>No tienes cuentas registradas</h4>
          <p className='text-muted'>
            Registra tu primera cuenta de WhatsApp Business para comenzar a enviar mensajes.
          </p>
          <Button
            variant='success'
            onClick={() => setShowCreateModal(true)}
            className='px-4 py-2 mt-2'
            style={{ borderRadius: '10px', fontWeight: 600 }}
          >
            <FaPlus className='me-2' />
            Registrar cuenta
          </Button>
        </div>
      ) : (
        <>
          {/* Account Cards */}
          <Row>
            {accounts.map(acc => {
              const isActive = activeId === acc.id;
              return (
                <Col md={6} xl={4} key={acc.id} className='mb-4'>
                  <Card
                    style={{
                      borderRadius: '14px',
                      border: isActive ? '2px solid #25D366' : '1px solid #e8e8e8',
                      boxShadow: isActive
                        ? '0 4px 20px rgba(37, 211, 102, 0.15)'
                        : '0 2px 12px rgba(0, 0, 0, 0.06)',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Card Top Band */}
                    <div
                      style={{
                        height: '6px',
                        background: isActive
                          ? 'linear-gradient(90deg, #25D366, #128C7E)'
                          : 'linear-gradient(90deg, #e0e0e0, #d0d0d0)',
                      }}
                    />

                    <Card.Body className='p-4'>
                      {/* Account Name & Status */}
                      <div className='d-flex justify-content-between align-items-start mb-3'>
                        <div className='d-flex align-items-center gap-2'>
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: '12px',
                              background: isActive
                                ? 'linear-gradient(135deg, #25D366, #128C7E)'
                                : '#f0f0f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <FaWhatsapp
                              style={{
                                fontSize: '1.3rem',
                                color: isActive ? '#fff' : '#999',
                              }}
                            />
                          </div>
                          <div>
                            <h5 className='mb-0 fw-bold' style={{ fontSize: '1rem', color: '#1a1a2e' }}>
                              {acc.name}
                            </h5>
                            {isActive ? (
                              <Badge
                                bg=''
                                style={{
                                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                }}
                              >
                                <FaCheckCircle className='me-1' />
                                ACTIVA
                              </Badge>
                            ) : (
                              <Badge
                                bg=''
                                style={{
                                  background: '#e9ecef',
                                  color: '#6c757d',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                }}
                              >
                                INACTIVA
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Account Details */}
                      <div
                        style={{
                          background: '#f8f9fa',
                          borderRadius: '10px',
                          padding: '14px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div className='d-flex align-items-center mb-2'>
                          <FaPhone className='me-2' style={{ color: '#6c757d', fontSize: '0.8rem' }} />
                          <span className='text-muted me-1'>Número:</span>
                          <span className='fw-semibold' style={{ color: '#1a1a2e' }}>{acc.phoneNumber}</span>
                        </div>
                        <div className='d-flex align-items-center mb-2'>
                          <FaIdBadge className='me-2' style={{ color: '#6c757d', fontSize: '0.8rem' }} />
                          <span className='text-muted me-1'>Phone ID:</span>
                          <span className='fw-semibold' style={{ color: '#1a1a2e', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {acc.phoneNumberId}
                          </span>
                        </div>
                        <div className='d-flex align-items-center mb-2'>
                          <FaBuilding className='me-2' style={{ color: '#6c757d', fontSize: '0.8rem' }} />
                          <span className='text-muted me-1'>WABA:</span>
                          <span className='fw-semibold' style={{ color: '#1a1a2e', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {acc.businessAccountId}
                          </span>
                        </div>
                        <div className='d-flex align-items-start'>
                          <FaKey className='me-2 mt-1' style={{ color: '#6c757d', fontSize: '0.8rem', flexShrink: 0 }} />
                          <span className='text-muted me-1' style={{ flexShrink: 0 }}>Token:</span>
                          <span
                            className='fw-semibold'
                            style={{
                              color: '#1a1a2e', fontFamily: 'monospace', fontSize: '0.78rem',
                              flex: 1, wordBreak: 'break-all', lineHeight: 1.4,
                            }}
                          >
                            {visibleTokens[acc.id] ? acc.accessToken : maskToken(acc.accessToken)}
                          </span>
                          <OverlayTrigger
                            placement='top'
                            overlay={<Tooltip>{visibleTokens[acc.id] ? 'Ocultar' : 'Mostrar'} token</Tooltip>}
                          >
                            <Button
                              variant='link'
                              size='sm'
                              className='p-0 ms-1 mt-0'
                              style={{ color: '#6c757d', flexShrink: 0 }}
                              onClick={() => toggleTokenVisibility(acc.id)}
                            >
                              {visibleTokens[acc.id] ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                          </OverlayTrigger>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className='d-flex gap-2 mt-3'>
                        {!isActive && (
                          <Button
                            variant='outline-success'
                            size='sm'
                            className='flex-fill'
                            style={{ borderRadius: '8px', fontWeight: 600 }}
                            onClick={() => handleSelectActive(acc.id)}
                          >
                            <FaCheckCircle className='me-1' />
                            Activar
                          </Button>
                        )}
                        <OverlayTrigger placement='top' overlay={<Tooltip>Editar cuenta</Tooltip>}>
                          <Button
                            variant='outline-primary'
                            size='sm'
                            style={{ borderRadius: '8px', width: 38 }}
                            onClick={() => handleEdit(acc)}
                          >
                            <FaEdit />
                          </Button>
                        </OverlayTrigger>
                        <OverlayTrigger placement='top' overlay={<Tooltip>Eliminar cuenta</Tooltip>}>
                          <Button
                            variant='outline-danger'
                            size='sm'
                            style={{ borderRadius: '8px', width: 38 }}
                            onClick={() => setShowDeleteConfirm(acc.id)}
                          >
                            <FaTrash />
                          </Button>
                        </OverlayTrigger>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      )}

      {/* ─── Modal: Crear nueva cuenta ─── */}
      <Modal
        show={showCreateModal}
        onHide={() => { setShowCreateModal(false); setShowCreateToken(false); }}
        centered
        size='lg'
      >
        <Modal.Header
          closeButton
          style={{
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            color: '#fff',
            border: 'none',
          }}
        >
          <Modal.Title className='d-flex align-items-center gap-2 fw-bold'>
            <FaWhatsapp />
            Registrar nueva cuenta
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4'>
          <p className='text-muted mb-4'>
            Ingresa las credenciales de tu cuenta de WhatsApp Business API.
            Puedes encontrarlas en el{' '}
            <a
              href='https://developers.facebook.com/'
              target='_blank'
              rel='noopener noreferrer'
              style={{ color: '#128C7E' }}
            >
              panel de Meta Developers
            </a>
            .
          </p>
          <Form onSubmit={handleSubmit} autoComplete='off'>
            {renderFormFields(form, handleChange, showCreateToken, () => setShowCreateToken(prev => !prev))}
            <div className='d-flex justify-content-end gap-2 mt-4'>
              <Button
                variant='outline-secondary'
                onClick={() => setShowCreateModal(false)}
                style={{ borderRadius: '8px', fontWeight: 600 }}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                variant='success'
                disabled={formLoading}
                className='px-4'
                style={{
                  borderRadius: '8px',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
                }}
              >
                {formLoading ? (
                  <>
                    <Spinner animation='border' size='sm' className='me-2' />
                    Guardando...
                  </>
                ) : (
                  <>
                    <FaPlus className='me-2' />
                    Crear cuenta
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ─── Modal: Editar cuenta ─── */}
      <Modal
        show={showEditModal}
        onHide={() => { setShowEditModal(false); setEditId(null); setShowEditToken(false); }}
        centered
        size='lg'
      >
        <Modal.Header
          closeButton
          style={{
            background: 'linear-gradient(135deg, #0d6efd, #0b5ed7)',
            color: '#fff',
            border: 'none',
          }}
        >
          <Modal.Title className='d-flex align-items-center gap-2 fw-bold'>
            <FaEdit />
            Editar cuenta
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4'>
          <Form onSubmit={handleEditSubmit} autoComplete='off'>
            {renderFormFields(editForm, handleEditChange, showEditToken, () => setShowEditToken(prev => !prev))}
            <div className='d-flex justify-content-end gap-2 mt-4'>
              <Button
                variant='outline-secondary'
                onClick={() => { setShowEditModal(false); setEditId(null); }}
                style={{ borderRadius: '8px', fontWeight: 600 }}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                variant='primary'
                className='px-4'
                style={{ borderRadius: '8px', fontWeight: 600 }}
              >
                <FaCheckCircle className='me-2' />
                Guardar cambios
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ─── Modal: Confirmar eliminación ─── */}
      <Modal
        show={!!showDeleteConfirm}
        onHide={() => setShowDeleteConfirm(null)}
        centered
        size='sm'
      >
        <Modal.Body className='text-center p-4'>
          <div style={{ fontSize: '3rem', color: '#dc3545', marginBottom: '1rem' }}>
            <FaExclamationTriangle />
          </div>
          <h5 className='fw-bold mb-2'>¿Eliminar cuenta?</h5>
          <p className='text-muted mb-4'>
            Esta acción no se puede deshacer. Se perderán todas las configuraciones de esta cuenta.
          </p>
          <div className='d-flex justify-content-center gap-2'>
            <Button
              variant='outline-secondary'
              onClick={() => setShowDeleteConfirm(null)}
              style={{ borderRadius: '8px', fontWeight: 600 }}
            >
              Cancelar
            </Button>
            <Button
              variant='danger'
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
              style={{ borderRadius: '8px', fontWeight: 600 }}
            >
              <FaTrash className='me-2' />
              Eliminar
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
    </>
  );
};

export default withAuthSync(WhatsAppAccountsPage);

export async function getServerSideProps(context: any) {
  return { props: {} };
}
