import React, { useEffect, useState } from 'react';
import { Navbar, Nav, NavDropdown, Container, Button } from 'react-bootstrap';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Select from 'react-select';
import {
  FaUser,
  FaEnvelope,
  FaEdit,
  FaSignOutAlt,
  FaCommentDots,
  FaComments,
  FaUsers,
  FaShoppingCart,
  FaPhone,
  FaClipboardList,
  FaPaperPlane,
  FaHistory,
} from 'react-icons/fa';
import logo from '../../public/img/logo_general.png';
import 'bootstrap-icons/font/bootstrap-icons.css';
import useUser from '@store/user';
import useMessages from '@store/messages';
import useUI from '@store/ui';
import { scheduleMessagesAPI } from '@/api/messages';

const Header = () => {
  const router = useRouter();
  const { fetchUser, user, logout, token } = useUser();
  const { labels, fetchLabels, messages } = useMessages();
  const { setLoading, addAlert } = useUI();
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const isDevAuto = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true';
    if (!user && token && !isDevAuto) {
      fetchUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  useEffect(() => {
    if (token) {
      fetchLabels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleScheduleMessages = async () => {
    if (!selectedLabels.length) {
      addAlert({ type: 'warning', message: 'Selecciona al menos una etiqueta' });
      return;
    }
    try {
      setIsSending(true);
      setLoading(true);
      await scheduleMessagesAPI(selectedLabels);
      addAlert({ type: 'success', message: 'Mensajes programados con éxito' });
      setSelectedLabels([]);
    } catch (err) {
      console.error('Error al programar mensajes:', err);
      addAlert({ type: 'danger', message: 'Error al programar mensajes' });
    } finally {
      setLoading(false);
      setIsSending(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleEditProfile = () => {
    router.push('/edit_user');
  };

  const isActive = (path: string) => router.pathname === path;

  return (
    <>
      <style jsx global>{`
        .modern-header {
          background: transparent;
          box-shadow: none;
          border: none;
          padding: 0.5rem 1rem;
          width: 100%;
        }
        .brand-section {
          display: flex;
          align-items: center;
          color: #111b21 !important;
          text-decoration: none;
          transition: transform 0.2s ease;
        }
        .brand-section:hover {
          transform: translateY(-2px);
          color: #111b21 !important;
          text-decoration: none;
        }
        .brand-text {
          display: inline-flex;
          align-items: baseline;
          gap: 8px;
          margin: 0 0 0 10px;
        }
        .brand-title {
          font-weight: 700;
          font-size: 1.3rem;
          line-height: 1.2;
          color: #111b21;
        }
        .user-greeting {
          font-size: 0.85rem;
          opacity: 0.9;
          font-weight: 400;
          line-height: 1.2;
          color: #111b21;
        }
        .nav-item-modern {
          margin: 0 2px;
          position: relative;
        }
        .nav-link-modern {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px;
          padding: 7px 12px !important;
          border-radius: 8px;
          color: #333 !important;
          text-decoration: none;
          transition: all 0.3s ease;
          font-weight: 500;
          font-size: 0.82rem;
          line-height: 1;
          white-space: nowrap;
        }
        .navbar .nav-link.nav-link-modern {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .nav-link-modern:hover {
          background: rgba(0, 0, 0, 0.08);
          color: #111 !important;
          transform: translateY(-1px);
        }
        .nav-link-modern.active {
          background: #e74c3c;
          color: white !important;
          font-weight: 600;
          box-shadow: 0 2px 10px rgba(231, 76, 60, 0.3);
        }
        .scheduler-section {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 12px;
        }
        .scheduler-select {
          min-width: 200px;
        }
        .send-btn {
          white-space: nowrap;
          font-size: 0.8rem;
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: 600;
        }
        .user-dropdown {
          background: rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.15);
          border-radius: 50%;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-text) !important;
          transition: all 0.3s ease;
        }
        .user-dropdown:hover {
          background: #e74c3c;
          color: white !important;
          transform: scale(1.1);
        }
        .nav-items-grid {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: nowrap;
        }
        .nav-icon {
          font-size: 1rem;
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          display: inline-block !important;
          vertical-align: middle;
          line-height: 1;
        }
        .user-dropdown-wrapper {
          display: flex;
          align-items: center;
          margin-left: 8px;
        }

        /* ========== Responsive: tablets y compacto (992–1200px) ========== */
        @media (min-width: 992px) and (max-width: 1200px) {
          .nav-link-modern {
            padding: 6px 8px !important;
            font-size: 0.75rem;
            gap: 4px;
          }
          .scheduler-section {
            margin: 0 6px;
          }
          .scheduler-select {
            min-width: 140px;
          }
          .brand-text {
            gap: 4px;
            margin: 0 0 0 6px;
          }
          .brand-title {
            font-size: 1.1rem;
          }
          .user-greeting {
            font-size: 0.7rem;
          }
        }

        @media (max-width: 991px) {
          .modern-header {
            padding: 0.4rem 0.5rem;
            position: sticky;
            top: 0;
            z-index: 1030;
            background: #fff !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          }
          .navbar-collapse {
            max-height: 70vh;
            overflow-y: auto;
            padding: 8px 0;
          }
          .nav-items-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            width: 100%;
            padding: 4px 0;
          }
          .nav-item-modern {
            margin: 0;
          }
          .nav-link-modern {
            margin: 0;
            padding: 10px 12px !important;
            border-radius: 10px;
            background: #f5f6f8;
            justify-content: center;
            font-size: 0.8rem;
          }
          .nav-link-modern.active {
            background: #e74c3c;
          }
          .scheduler-section {
            flex-direction: row;
            width: 100%;
            margin: 8px 0;
            padding: 8px 0;
            border-top: 1px solid #eee;
          }
          .scheduler-select {
            flex: 1;
            min-width: 0;
          }
          .send-btn {
            flex-shrink: 0;
          }
          .user-dropdown-wrapper {
            border-top: 1px solid #eee;
            padding-top: 8px;
            margin-top: 4px;
            width: 100%;
            display: flex;
            justify-content: center;
          }
          .brand-title {
            font-size: 1.1rem;
          }
          .user-greeting {
            font-size: 0.75rem;
          }
        }
      `}</style>

      <Navbar expand='lg' className='modern-header'>
        <Container fluid>
          <Navbar.Brand href='https://www.prizma.co/' target='_blank' className='brand-section'>
            <Image
              src={logo}
              alt='IRIS Logo'
              width={40}
              height={40}
              style={{ borderRadius: '8px' }}
            />
            <div className='brand-text'>
              <span className='brand-title'>IRIS</span>
              {user && (
                <span className='user-greeting'>
                  Hola, {user.name?.split(' ')[0] || 'Usuario'}
                </span>
              )}
            </div>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls='basic-navbar-nav' style={{ borderColor: 'rgba(255,255,255,0.3)' }} />

          <Navbar.Collapse id='basic-navbar-nav' className='justify-content-end'>
            <Nav className='align-items-center'>
              <div className='nav-items-grid'>
                <Nav.Item className='nav-item-modern'>
                  <Nav.Link
                    href='/whatsapp-sessions'
                    className={`nav-link-modern ${isActive('/whatsapp-sessions') ? 'active' : ''}`}
                  >
                    <FaPhone className='nav-icon' />
                    <span>WhatsApp</span>
                  </Nav.Link>
                </Nav.Item>

                <Nav.Item className='nav-item-modern'>
                  <Nav.Link
                    href='/templates'
                    className={`nav-link-modern ${isActive('/templates') ? 'active' : ''}`}
                  >
                    <FaClipboardList className='nav-icon' />
                    <span>Templates</span>
                  </Nav.Link>
                </Nav.Item>

                <Nav.Item className='nav-item-modern'>
                  <Nav.Link
                    href='/messages'
                    className={`nav-link-modern ${isActive('/messages') ? 'active' : ''}`}
                  >
                    <FaCommentDots className='nav-icon' />
                    <span>Mensajes</span>
                  </Nav.Link>
                </Nav.Item>

                <Nav.Item className='nav-item-modern'>
                  <Nav.Link
                    href='/customers'
                    className={`nav-link-modern ${isActive('/customers') ? 'active' : ''}`}
                  >
                    <FaUsers className='nav-icon' />
                    <span>Clientes</span>
                  </Nav.Link>
                </Nav.Item>

                <Nav.Item className='nav-item-modern'>
                  <Nav.Link
                    href='/message-logs'
                    className={`nav-link-modern ${isActive('/message-logs') ? 'active' : ''}`}
                  >
                    <FaHistory className='nav-icon' />
                    <span>Historial</span>
                  </Nav.Link>
                </Nav.Item>

                <Nav.Item className='nav-item-modern'>
                  <Nav.Link
                    href='/chat'
                    className={`nav-link-modern ${isActive('/chat') ? 'active' : ''}`}
                  >
                    <FaComments className='nav-icon' />
                    <span>Chat</span>
                  </Nav.Link>
                </Nav.Item>
              </div>

              {/* Programar envío masivo */}
              <div className='scheduler-section'>
                <div className='scheduler-select'>
                  <Select
                    placeholder='Etiquetas...'
                    isMulti
                    instanceId='header-labels'
                    onChange={(event: any) => {
                      setSelectedLabels(event ? event.map((e: any) => e.value) : []);
                    }}
                    options={labels}
                    value={labels.filter((l: any) => selectedLabels.includes(l.value))}
                    styles={{
                      control: (base: any) => ({
                        ...base,
                        minHeight: '34px',
                        fontSize: '0.8rem',
                        borderRadius: '17px',
                        background: 'rgba(255,255,255,0.95)',
                      }),
                      multiValue: (base: any) => ({
                        ...base,
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                      }),
                      placeholder: (base: any) => ({
                        ...base,
                        fontSize: '0.8rem',
                        color: '#999',
                      }),
                      menu: (base: any) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                    }}
                  />
                </div>
                <Button
                  variant='primary'
                  size='sm'
                  className='send-btn'
                  onClick={handleScheduleMessages}
                  disabled={selectedLabels.length === 0 || isSending}
                >
                  <FaPaperPlane style={{ marginRight: 4 }} />
                  Enviar
                </Button>
              </div>

              <div className='user-dropdown-wrapper'>
                <NavDropdown
                  title={<FaUser style={{ fontSize: '1.1rem' }} />}
                  id='user-menu'
                  align={{ lg: 'end' }}
                  className='user-dropdown'
                >
                  <NavDropdown.Item href='/plans' style={{ borderRadius: '8px', margin: '4px' }}>
                    <FaShoppingCart style={{ marginRight: '8px', color: 'var(--primary-color)' }} />
                    Planes
                  </NavDropdown.Item>
                  <NavDropdown.Item href='/contact' style={{ borderRadius: '8px', margin: '4px' }}>
                    <FaEnvelope style={{ marginRight: '8px', color: 'var(--primary-color)' }} />
                    Contáctanos
                  </NavDropdown.Item>
                  <NavDropdown.Item onClick={handleEditProfile} style={{ borderRadius: '8px', margin: '4px' }}>
                    <FaEdit style={{ marginRight: '8px', color: 'var(--warning-color)' }} />
                    Editar perfil
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout} style={{ borderRadius: '8px', margin: '4px', color: '#dc3545' }}>
                    <FaSignOutAlt style={{ marginRight: '8px' }} />
                    Cerrar sesión
                  </NavDropdown.Item>
                </NavDropdown>
              </div>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
};

export default Header;
