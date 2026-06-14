import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { Card, Form, Button, Row, Col, Container, Modal } from 'react-bootstrap';
import Image from 'next/image';
import { FaApple, FaMicrosoft, FaFacebook } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import logo from '@public/img/BANER.png';
import useUser from '@store/user';
import styles from '@styles/Login.module.css';
import { ProviderName } from '@utils/firebase.config';
import Register from './Register';
import PasswordResetModal from './PasswordResetModal';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const { loginWithEmail, loginWithProvider, resetPassword } = useUser();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    await loginWithEmail(email, password);
    setIsLoading(false);
  };

  const handleRegister = () => {
    setShowRegisterModal(true);
  };

  const handlePasswordReset = async (email: string) => {
    await resetPassword(email);
    setShowPasswordResetModal(false);
  };

  const handleLoginWithProvider = async (providerName: ProviderName) => {
    await loginWithProvider(providerName);
    setShowLoginModal(false);
  };

  return (
    <>
      <Container className={styles.loginContainer} fluid>
        <Row className='justify-content-center'>
          <Col md='8' lg='10' className='d-flex flex-column align-items-center'>
            <Image fetchPriority='high' src={logo} alt='EMW Logo' width={120} height={120} />
            <br />
            <Card className={styles.card}>
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  <Form.Group controlId='formBasicEmail'>
                    <Form.Control
                      placeholder='Correo electrónico'
                      type='text'
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </Form.Group>
                  <br />
                  <Form.Group controlId='formBasicPassword'>
                    <Form.Control
                      placeholder='Contraseña'
                      type='password'
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </Form.Group>
                  <br />
                  <Button
                    style={{ width: '100%' }}
                    className='btn btn-warning btn-block mb-3'
                    type='submit'
                    disabled={isLoading}
                  >
                    {isLoading ? 'Cargando...' : 'Iniciar sesión'}
                  </Button>
                  <Button
                    style={{ width: '100%' }}
                    className='btn btn-secondary btn-block mb-3'
                    onClick={() => setShowLoginModal(true)}
                  >
                    Continuar con Google, Apple, Facebook o Microsoft
                  </Button>
                  <Button
                    style={{ width: '100%' }}
                    variant='link'
                    onClick={() => setShowPasswordResetModal(true)}
                    className={styles.forgotPasswordLink}
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                  <hr />
                  <Button
                    style={{ width: '100%' }}
                    className='btn btn-secondary btn-block'
                    onClick={handleRegister}
                  >
                    Registrarse
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)} centered>
        <Modal.Body className='d-flex flex-column align-items-center'>
          <Button
            style={{ width: '100%' }}
            className='btn btn-secondary btn-block mb-3 d-flex align-items-center'
            onClick={() => handleLoginWithProvider('google')}
          >
            <FcGoogle size={24} className='mr-3' style={{ color: '#DB4437' }} />
            <span className='flex-grow-1 text-center'>Continuar con Google</span>
          </Button>
          <Button
            disabled
            style={{ width: '100%' }}
            className='btn btn-secondary btn-block mb-3 d-flex align-items-center'
            onClick={() => handleLoginWithProvider('apple')}
          >
            <FaApple size={24} className='mr-3' style={{ color: '#000000' }} />
            <span className='flex-grow-1 text-center'>Continuar con Apple</span>
          </Button>
          <Button
            disabled
            style={{ width: '100%' }}
            className='btn btn-secondary btn-block mb-3 d-flex align-items-center'
            onClick={() => handleLoginWithProvider('microsoft')}
          >
            <FaMicrosoft size={24} className='mr-3' style={{ color: '#F3BA2F' }} />
            <span className='flex-grow-1 text-center'>Continuar con Microsoft</span>
          </Button>
          <Button
            disabled
            style={{ width: '100%' }}
            className='btn btn-secondary btn-block d-flex align-items-center'
            onClick={() => handleLoginWithProvider('facebook')}
          >
            <FaFacebook size={24} className='mr-3' style={{ color: '#4267B2' }} />
            <span className='flex-grow-1 text-center'>Continuar con Facebook</span>
          </Button>
          <hr style={{ width: '100%' }} />
          <Button
            style={{ width: '100%' }}
            className='btn btn-secondary btn-block'
            onClick={handleRegister}
          >
            Registrarse
          </Button>
        </Modal.Body>
      </Modal>

      <Register show={showRegisterModal} handleClose={() => setShowRegisterModal(false)} />

      <PasswordResetModal
        show={showPasswordResetModal}
        handleClose={() => setShowPasswordResetModal(false)}
        handlePasswordReset={handlePasswordReset}
      />
    </>
  );
};

export default Login;
