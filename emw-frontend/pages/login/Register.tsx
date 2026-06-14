import React, { useState, FormEvent } from 'react';
import { Form, Button, Modal } from 'react-bootstrap';
import useUser from '@store/user';
import useUI from '@store/ui';
import styles from '@styles/Register.module.css';

type RegisterProps = {
  show: boolean;
  handleClose: () => void;
};

const Register: React.FC<RegisterProps> = ({ show, handleClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { registerUser } = useUser();
  const { addAlert, setLoading } = useUI();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // Validaciones de campos
    if (!firstName.trim() || !lastName.trim()) {
      addAlert({ type: 'danger', message: 'Nombres y apellidos son requeridos' });
      return;
    }

    if (!email.trim()) {
      addAlert({ type: 'danger', message: 'El correo electrónico es requerido' });
      return;
    }

    if (!password || password.length < 6) {
      addAlert({ type: 'danger', message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    if (password !== confirmPassword) {
      addAlert({ type: 'danger', message: 'Las contraseñas no coinciden' });
      return;
    }

    setLoading(true);
    setIsLoading(true);

    const userData = {
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };

    try {
      await registerUser(userData);
      handleClose();
    } catch (error) {
      addAlert({ type: 'danger', message: 'Error en el registro' });
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title className='w-100 text-center'>Regístrate</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit} className={styles['register-form']}>
          <Form.Group controlId='formBasicEmail' className='mb-3'>
            <Form.Control
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='Correo electronico'
              required
            />
          </Form.Group>
          <Form.Group controlId='formBasicPassword' className='mb-3'>
            <Form.Control
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder='Contraseña'
              required
            />
          </Form.Group>
          <Form.Group controlId='formBasicConfirmPassword' className='mb-3'>
            <Form.Control
              type='password'
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder='Confirmar contraseña'
              required
            />
          </Form.Group>
          <Form.Group controlId='formBasicFirstName' className='mb-3'>
            <Form.Control
              type='text'
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder='Nombres'
              required
            />
          </Form.Group>
          <Form.Group controlId='formBasicLastName' className='mb-3'>
            <Form.Control
              type='text'
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder='Apellidos'
              required
            />
          </Form.Group>
          <Button variant='success' type='submit' disabled={isLoading} className='w-100 mt-3'>
            {isLoading ? 'Cargando...' : 'Regístrate'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default Register;
