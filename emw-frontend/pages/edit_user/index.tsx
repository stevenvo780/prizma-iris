import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import SeoHead from '@components/SeoHead';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import useUser from '@store/user';
import useUI from '@store/ui';
import { withAuthSync } from '@utils/auth';

const EditProfile: React.FC = () => {
  const { user, fetchUser, updateUserProfile, changePassword, token } = useUser();
  const { addAlert } = useUI();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        name: user.name || '',
        phone: user.phone || '',
      });
    } else {
      if (token) {
        fetchUser();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addAlert({ type: 'danger', message: 'El nombre es requerido' });
      return;
    }
    if (!formData.email.trim()) {
      addAlert({ type: 'danger', message: 'El correo electrónico es requerido' });
      return;
    }
    updateUserProfile(formData);
  };

  const handleChangePassword = (e: FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword.trim()) {
      addAlert({ type: 'danger', message: 'Ingresa tu contraseña actual' });
      return;
    }
    if (!passwordData.newPassword.trim()) {
      addAlert({ type: 'danger', message: 'Ingresa la nueva contraseña' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      addAlert({ type: 'danger', message: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }
    changePassword(passwordData.currentPassword, passwordData.newPassword);
  };

  return (
    <>
      <SeoHead title="Editar perfil" pathname="/edit_user" noIndex />
      <Container>
      <Row>
        <Col md={{ span: 6, offset: 3 }}>
          <h2>Editar Perfil</h2>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId='formEmail' className='mb-3'>
              <Form.Control
                type='email'
                name='email'
                value={formData.email}
                onChange={handleInputChange}
                placeholder='Correo electrónico'
              />
            </Form.Group>
            <Form.Group controlId='formName' className='mb-3'>
              <Form.Control
                type='text'
                name='name'
                value={formData.name}
                onChange={handleInputChange}
                placeholder='Nombre'
              />
            </Form.Group>
            <Form.Group controlId='formClientPhone' className='mb-3'>
              <Form.Control
                type='text'
                name='phone'
                value={formData.phone}
                onChange={handleInputChange}
                placeholder='Teléfono'
              />
            </Form.Group>
            <Button variant='primary' type='submit' style={{ marginTop: '20px' }}>
              Actualizar
            </Button>
          </Form>
        </Col>
        <Col md={{ span: 6, offset: 3 }}>
          <br />
          <h2>Cambiar Contraseña</h2>
          <Form onSubmit={handleChangePassword}>
            <Form.Group controlId='formCurrentPassword' className='mb-3'>
              <Form.Control
                type='password'
                name='currentPassword'
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder='Contraseña actual'
              />
            </Form.Group>
            <Form.Group controlId='formNewPassword' className='mb-3'>
              <Form.Control
                type='password'
                name='newPassword'
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder='Nueva contraseña'
              />
            </Form.Group>
            <Button variant='primary' type='submit' style={{ marginTop: '20px' }}>
              Cambiar Contraseña
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
    </>
  );
};

export default withAuthSync(EditProfile);

export async function getServerSideProps(context: any) {
  return { props: {} };
}
