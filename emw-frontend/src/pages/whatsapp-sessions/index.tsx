import { FC, useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Button, Form } from 'react-bootstrap';
import { withAuthSync } from '@utils/auth';
import useUI from '@/store/ui';
import useUser from '@/store/user';
import {
  createWppAccount,
  getWppAccounts,
  deleteWppAccount,
  updateWppAccount,
  deleteAllWppAccounts,
} from '@/api/whatsapp';

interface WppAccount {
  id: string;
  name: string;
  phoneNumberId: string;
  accessToken: string;
  wabaId: string;
  isActive?: boolean;
}

const initialForm = {
  name: '',
  phoneNumberId: '',
  accessToken: '',
  wabaId: '',
};

const WhatsAppAccountsPage: FC = () => {
  const { setLoading, addAlert } = useUI();
  const { user } = useUser();
  const { setActiveWhatsappAccount, getActiveWhatsappAccount } = useUser();
  const [accounts, setAccounts] = useState<WppAccount[]>([]);
  const [loading, setLoadingState] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    phoneNumberId: string;
    accessToken: string;
    wabaId: string;
  }>({ name: '', phoneNumberId: '', accessToken: '', wabaId: '' });

  const fetchAccounts = async () => {
    setLoadingState(true);
    setError(null);
    try {
      const res = await getWppAccounts();
      console.log('🔍 Cuentas obtenidas del backend:', res.data);
      setAccounts(res.data);
    } catch (err: any) {
      console.error('❌ Error al obtener cuentas:', err);
      console.error('Respuesta del servidor:', err?.response?.data);
      setError('Error al obtener cuentas de WhatsApp');
    } finally {
      setLoadingState(false);
    }
  };

  const handleUpdateExistingAccount = async (formData: any) => {
    try {
      console.log('🔄 Buscando cuenta existente para actualizar...');

      const res = await getWppAccounts();
      console.log('🔍 Todas las cuentas del backend:', res.data);

      const existingAccount = res.data.find((acc: any) =>
        acc.phoneNumberId === formData.phoneNumberId
      );

      if (existingAccount) {
        console.log('✅ Cuenta encontrada:', existingAccount);

        await updateWppAccount(existingAccount.id, {
          name: formData.name,
          accessToken: formData.accessToken,
          businessAccountId: formData.wabaId,
        });

        addAlert({
          type: 'success',
          message: `Cuenta '${existingAccount.name}' actualizada correctamente`
        });
        setForm({ name: '', phoneNumberId: '', accessToken: '', wabaId: '' });
        await fetchAccounts();
      } else {
        console.log('❌ No se encontró cuenta con phoneNumberId:', formData.phoneNumberId);
        console.log('📋 PhoneNumberIds disponibles:', res.data.map((acc: any) => acc.phoneNumberId));
        throw new Error('No se encontró la cuenta para actualizar');
      }
    } catch (err) {
      console.error('Error updating account:', err);
      throw err;
    }
  };

  const handleDeleteAllAccounts = async () => {
    const confirmed = window.confirm(
      '⚠️ ADVERTENCIA: Esto eliminará TODAS las cuentas WhatsApp de la base de datos.\n\n' +
      'Esta acción no se puede deshacer.\n\n' +
      '¿Estás seguro que deseas continuar?'
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteAllWppAccounts();
      addAlert({
        type: 'success',
        message: 'Todas las cuentas han sido eliminadas de la base de datos'
      });
      await fetchAccounts();
    } catch (err: any) {
      console.error('Error deleting all accounts:', err);
      addAlert({
        type: 'danger',
        message: 'Error al eliminar las cuentas. Es posible que el endpoint no exista en el backend.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {

    const activeAccount = accounts.find(acc => {
      return (acc as any).isActive === true;
    });

    if (activeAccount) {
      setActiveId(activeAccount.id);
    } else {
      setActiveId(null);
    }
    // eslint-disable-next-line
  }, [accounts]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 INICIANDO handleSubmit en /src/pages/whatsapp-sessions');
    setFormLoading(true);
    setLoading(true);
    try {
      console.log('📞 Llamando a createWppAccount...');
      await createWppAccount(form);
      addAlert({ type: 'success', message: 'Cuenta creada correctamente' });
      setForm(initialForm);
      fetchAccounts();
    } catch (err: any) {
      console.error('Error creating account:', err);
      console.log('🔍 Error response data:', err?.response?.data);
      console.log('🔍 Error message:', err?.response?.data?.message);

      if (err?.response?.data?.message?.includes('already exists')) {
        console.log('✅ Detectado error de cuenta duplicada, iniciando auto-actualización...');

        addAlert({
          type: 'info',
          message: 'Detectada cuenta existente. Actualizando con nuevos datos...'
        });

        try {
          await handleUpdateExistingAccount(form);
        } catch (updateErr) {
          console.error('Error actualizando cuenta:', updateErr);
          addAlert({
            type: 'danger',
            message: 'Error al actualizar la cuenta existente. Verifica que tengas permisos.'
          });
        }
      } else if (err?.response?.data?.message) {
        addAlert({
          type: 'danger',
          message: `Error: ${err.response.data.message}`
        });
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
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteWppAccount(id);
      addAlert({ type: 'success', message: 'Cuenta eliminada' });
      fetchAccounts();
      if (activeId === id) setActiveId(null);
    } catch (err: any) {

      if (err?.response?.data?.message?.includes('violates foreign key constraint')) {
        addAlert({
          type: 'warning',
          message: 'No se puede eliminar la cuenta porque tiene mensajes asociados. Elimine primero los mensajes o contacte al administrador.'
        });
      } else {
        addAlert({ type: 'danger', message: 'Error al eliminar la cuenta' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (acc: WppAccount) => {
    setEditId(acc.id);
    setEditForm({
      name: acc.name,
      phoneNumberId: acc.phoneNumberId,
      accessToken: acc.accessToken,
      wabaId: acc.wabaId,
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setLoading(true);
    try {
      await updateWppAccount(editId, editForm);
      addAlert({ type: 'success', message: 'Cuenta actualizada' });
      setEditId(null);
      fetchAccounts();
    } catch (err) {
      addAlert({ type: 'danger', message: 'Error al actualizar la cuenta' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ marginTop: '20px' }}>
      <Row>
        <Col sm='12'>
          <h2>Cuentas de WhatsApp Business</h2>
          <p>
            Configura aquí tus credenciales de WhatsApp Business API para poder enviar mensajes.
          </p>
        </Col>
      </Row>
      <hr />
      <Row className='mb-4'>
        <Col md={8} lg={6}>
          <Card>
            <Card.Header>Registrar nueva cuenta</Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className='mb-2'>
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control name='name' value={form.name} onChange={handleChange} required />
                </Form.Group>
                <Form.Group className='mb-2'>
                  <Form.Label>ID de número de teléfono</Form.Label>
                  <Form.Control
                    name='phoneNumberId'
                    value={form.phoneNumberId}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                <Form.Group className='mb-2'>
                  <Form.Label>Access Token</Form.Label>
                  <Form.Control
                    name='accessToken'
                    value={form.accessToken}
                    onChange={handleChange}
                    required
                    type='password'
                  />
                </Form.Group>
                <Form.Group className='mb-2'>
                  <Form.Label>ID de WABA</Form.Label>
                  <Form.Control
                    name='wabaId'
                    value={form.wabaId}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                <Button type='submit' variant='primary' disabled={formLoading}>
                  {formLoading ? 'Guardando...' : 'Guardar cuenta'}
                </Button>
                <Button
                  type='button'
                  variant='danger'
                  className='ms-2'
                  onClick={handleDeleteAllAccounts}
                  disabled={loading}
                >
                  🗑️ Limpiar BD
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col md={10} lg={8}>
          <h4 className='mb-3'>Tus cuentas registradas</h4>
          {loading ? (
            <Spinner animation='border' />
          ) : error ? (
            <Alert variant='danger'>{error}</Alert>
          ) : accounts.length === 0 ? (
            <Alert variant='info'>No tienes cuentas registradas.</Alert>
          ) : (
            <>
              {activeId && (
                <Alert variant='success' className='mb-3'>
                  <strong>✅ Cuenta Activa:</strong>{' '}
                  {accounts.find(acc => acc.id === activeId)?.name || 'Desconocida'}
                </Alert>
              )}
              {!activeId && accounts.length > 0 && (
                <Alert variant='warning' className='mb-3'>
                  <strong>⚠️ No hay cuenta activa seleccionada.</strong> Haz clic en una cuenta para
                  activarla.
                </Alert>
              )}
              {accounts.map(acc => (
                <Card
                  className={`mb-3 ${activeId === acc.id ? 'border-success shadow' : ''}`}
                  key={acc.id}
                  style={{ cursor: 'pointer', borderWidth: activeId === acc.id ? 3 : 1 }}
                  onClick={() => {
                    if (editId !== acc.id) handleSelectActive(acc.id);
                  }}
                >
                  <Card.Body>
                    <div className='d-flex justify-content-between align-items-center'>
                      <div style={{ flex: 1 }}>
                        {editId === acc.id ? (
                          <Form onSubmit={handleEditSubmit}>
                            <Form.Group className='mb-2'>
                              <Form.Label>Nombre</Form.Label>
                              <Form.Control
                                name='name'
                                value={editForm.name}
                                onChange={handleEditChange}
                                required
                              />
                            </Form.Group>
                            <Form.Group className='mb-2'>
                              <Form.Label>ID de número de teléfono</Form.Label>
                              <Form.Control
                                name='phoneNumberId'
                                value={editForm.phoneNumberId}
                                onChange={handleEditChange}
                                required
                              />
                            </Form.Group>
                            <Form.Group className='mb-2'>
                              <Form.Label>Access Token</Form.Label>
                              <Form.Control
                                name='accessToken'
                                value={editForm.accessToken}
                                onChange={handleEditChange}
                                required
                                type='password'
                              />
                            </Form.Group>
                            <Form.Group className='mb-2'>
                              <Form.Label>ID de WABA</Form.Label>
                              <Form.Control
                                name='wabaId'
                                value={editForm.wabaId}
                                onChange={handleEditChange}
                                required
                              />
                            </Form.Group>
                            <Button type='submit' size='sm' variant='success' className='me-2'>
                              Guardar
                            </Button>
                            <Button
                              size='sm'
                              variant='secondary'
                              onClick={e => {
                                e.stopPropagation();
                                setEditId(null);
                              }}
                            >
                              Cancelar
                            </Button>
                          </Form>
                        ) : (
                          <>
                            <div>
                              <b>{acc.name}</b>
                              {activeId === acc.id && (
                                <span className='badge bg-success ms-2'>✅ ACTIVA</span>
                              )}
                            </div>
                            <div className='text-muted small'>ID: {acc.phoneNumberId}</div>
                            <div className='text-muted small'>
                              Token:{' '}
                              {acc.accessToken
                                ? '***' + acc.accessToken.slice(-8)
                                : 'No configurado'}
                            </div>
                            <div className='text-muted small'>WABA ID: {acc.wabaId}</div>
                          </>
                        )}
                      </div>
                      <div className='ms-2 d-flex flex-column align-items-end'>
                        <Button
                          size='sm'
                          variant='outline-primary'
                          className='mb-1'
                          onClick={e => {
                            e.stopPropagation();
                            handleEdit(acc);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          size='sm'
                          variant='outline-danger'
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(acc.id);
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default withAuthSync(WhatsAppAccountsPage);
