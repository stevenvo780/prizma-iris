import React, { useState, FormEvent } from 'react';
import Head from 'next/head';
import { Button, Container, Row, Col, Card, Modal, Form, Badge } from 'react-bootstrap';
import Image from 'next/image';
import {
  FaApple, FaMicrosoft, FaFacebook, FaWhatsapp, FaUsers, FaChartLine,
  FaRobot, FaFileAlt, FaComments, FaCheck, FaBolt, FaShieldAlt,
  FaTags, FaPaperPlane, FaArrowRight, FaRocket, FaStar, FaGem, FaWrench,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';
import logo from '@public/img/BANER.png';
import useUser from '@store/user';
import useUI from '@store/ui';
import { ProviderName } from '@utils/firebase.config';
import Register from './Register';
import PasswordResetModal from './PasswordResetModal';
import Events from '@components/Events';

const features = [
  { icon: <FaWhatsapp size={36} />, title: 'WhatsApp Business API', desc: 'Conecta tu cuenta oficial de WhatsApp Business y gestiona todas las conversaciones desde un solo lugar.', color: '#25D366' },
  { icon: <FaPaperPlane size={36} />, title: 'Mensajes Masivos', desc: 'Envía campañas a miles de clientes con plantillas aprobadas, segmentación por etiquetas y métricas en tiempo real.', color: '#3498db' },
  { icon: <FaComments size={36} />, title: 'Chat en Tiempo Real', desc: 'Responde a tus clientes al instante con nuestro chat integrado. Envía texto, imágenes, documentos y más.', color: '#e74c3c' },
  { icon: <FaRobot size={36} />, title: 'Robot Auto-Respuesta', desc: 'Configura respuestas automáticas inteligentes para atender a tus clientes 24/7 sin intervención manual.', color: '#9b59b6' },
  { icon: <FaUsers size={36} />, title: 'Gestión de Clientes', desc: 'Importa, organiza y segmenta tu base de contactos con etiquetas personalizadas y campos customizables.', color: '#f39c12' },
  { icon: <FaFileAlt size={36} />, title: 'Templates Aprobados', desc: 'Crea y gestiona plantillas de mensajes aprobadas por Meta para tus campañas de marketing y notificaciones.', color: '#1abc9c' },
  { icon: <FaTags size={36} />, title: 'Opt-In Automatizado', desc: 'Cumple con las políticas de WhatsApp con nuestro flujo de opt-in automatizado y gestión de consentimiento.', color: '#2ecc71' },
  { icon: <FaChartLine size={36} />, title: 'Historial y Métricas', desc: 'Consulta el historial completo de mensajes, estadísticas de envío, lectura y entrega de cada campaña.', color: '#e67e22' },
];

const planFeatures = [
  'Cuenta WhatsApp Business API',
  'Mensajes masivos ilimitados',
  'Chat en tiempo real',
  'Robot auto-respuesta',
  'Gestión de contactos ilimitados',
  'Importación / Exportación Excel',
  'Templates personalizados',
  'Notificaciones en navegador',
  'Envío de multimedia (imagen, audio, video, docs)',
  'Etiquetas y segmentación avanzada',
  'Historial completo de mensajes',
  'Soporte técnico prioritario',
];

const Landing = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [useFirebaseAuth] = useState(false);
  const { loginWithEmail, loginWithProvider, loginWithBackend, resetPassword, autoLoginForDev } = useUser();
  const { addAlert } = useUI();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      addAlert({ type: 'warning', message: 'Por favor, ingresa tu correo electrónico y contraseña.' });
      return;
    }
    setIsLoading(true);
    if (useFirebaseAuth) {
      await loginWithEmail(email, password);
    } else {
      await loginWithBackend(email, password);
    }
    setIsLoading(false);
  };

  const handlePasswordReset = async (resetEmail: string) => {
    await resetPassword(resetEmail);
    setShowPasswordResetModal(false);
  };

  const handleLoginWithProvider = async (providerName: ProviderName) => {
    await loginWithProvider(providerName);
    setShowProviderModal(false);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Head>
        <title>EMW — Enterprise WhatsApp Messaging | Olympo</title>
        <meta
          name="description"
          content="EMW, la plataforma de WhatsApp Business API de Olympo: gestiona conversaciones, envía campañas masivas y automatiza respuestas para hacer crecer tu negocio."
        />
        <link rel="icon" href="/img/cauce-favicon.svg" />
      </Head>
      <Events />

      {/* ───── NAVBAR ───── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '12px 0',
      }}>
        <Container className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => scrollTo('hero')}>
            <Image src={logo} alt="EMW" width={40} height={40} />
            <span className="d-none d-sm-inline" style={{ fontWeight: 700, fontSize: '1.3rem', color: '#0a827f' }}>EMW</span>
          </div>
          <div className="d-none d-md-flex gap-4 align-items-center">
            <a onClick={() => scrollTo('features')} style={{ cursor: 'pointer', color: '#555', fontWeight: 500, textDecoration: 'none' }}>Funcionalidades</a>
            <a onClick={() => scrollTo('plans')} style={{ cursor: 'pointer', color: '#555', fontWeight: 500, textDecoration: 'none' }}>Planes</a>
          </div>
          <div className="d-flex gap-2">
            <Button size="sm" onClick={() => setShowLoginModal(true)}
              className="nav-btn-login"
              style={{ borderRadius: 20, padding: '6px 16px', background: 'transparent', border: '2px solid #0a827f', color: '#0a827f', fontWeight: 600, whiteSpace: 'nowrap' }}>
              <span className="d-none d-sm-inline">Iniciar sesión</span>
              <span className="d-sm-none">Entrar</span>
            </Button>
            <Button size="sm" onClick={() => setShowRegisterModal(true)}
              className="nav-btn-register"
              style={{ borderRadius: 20, padding: '6px 16px', background: '#0a827f', border: 'none', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
              <span className="d-none d-sm-inline">Registrarse</span>
              <span className="d-sm-none">Registro</span>
            </Button>
          </div>
        </Container>
      </nav>

      {/* ───── HERO ───── */}
      <section id="hero" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        paddingTop: 80, paddingBottom: 40,
        background: 'linear-gradient(135deg, #0a827f 0%, #0d9e9a 40%, #11b4af 70%, #25D366 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 40%)',
        }} />
        <Container style={{ position: 'relative', zIndex: 1 }}>
          <Row className="align-items-center">
            <Col lg={7} className="text-white mb-5 mb-lg-0 text-center text-lg-start">
              <Badge bg="light" text="dark" className="mb-3" style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FaRocket style={{ color: '#0a827f' }} /> WhatsApp Business API al mejor precio
              </Badge>
              <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 24 }}>
                Potencia tu negocio con{' '}
                <span style={{ background: 'linear-gradient(90deg, #ffe082, #ffd54f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  mensajería inteligente
                </span>
              </h1>
              <p style={{ fontSize: '1.2rem', opacity: 0.92, lineHeight: 1.7, marginBottom: 32, maxWidth: 560, margin: '0 auto 32px' }}>
                Gestiona conversaciones, envía campañas masivas, automatiza respuestas y haz crecer tu negocio
                con la plataforma más completa de WhatsApp Business API.
              </p>
              <div className="d-flex gap-3 flex-wrap justify-content-center justify-content-lg-start">
                <Button size="lg" onClick={() => setShowRegisterModal(true)} style={{
                  background: 'linear-gradient(135deg, #f39c12, #e67e22)', border: 'none',
                  borderRadius: 30, padding: '14px 36px', fontWeight: 700, fontSize: '1.1rem',
                  boxShadow: '0 4px 20px rgba(243,156,18,0.4)',
                }}>
                  Comenzar gratis <FaArrowRight style={{ marginLeft: 8 }} />
                </Button>
                <Button variant="outline-light" size="lg" onClick={() => scrollTo('features')} style={{
                  borderRadius: 30, padding: '14px 36px', fontWeight: 600, fontSize: '1.05rem', borderWidth: 2,
                }}>
                  Ver funcionalidades
                </Button>
              </div>
              <div className="d-flex flex-wrap gap-2 gap-md-4 mt-4 justify-content-center justify-content-lg-start" style={{ opacity: 0.8, fontSize: '0.9rem' }}>
                <span><FaCheck className="me-1" /> CRM integrado</span>
                <span><FaCheck className="me-1" /> Soporte técnico dedicado</span>
                <span><FaCheck className="me-1" /> Configuración en minutos</span>
              </div>
            </Col>
            <Col lg={5} className="text-center">
              <div className="hero-login-card" style={{
                background: 'rgba(255,255,255,0.12)', borderRadius: 24, padding: 40,
                backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              }}>
                <Image src={logo} alt="EMW Logo" width={100} height={100} />
                <h3 className="text-white mt-3 mb-2" style={{ fontWeight: 700 }}>EMW Platform</h3>
                <p className="text-white mb-4" style={{ opacity: 0.85 }}>Enterprise WhatsApp Messaging</p>
                <div className="d-grid gap-2">
                  <Button onClick={() => setShowLoginModal(true)} style={{
                    background: 'white', color: '#0a827f', border: 'none',
                    borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: '1.05rem',
                  }}>
                    Iniciar sesión
                  </Button>
                  <Button onClick={() => setShowRegisterModal(true)} style={{
                    background: 'linear-gradient(135deg, #f39c12, #e67e22)', border: 'none',
                    borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: '1.05rem',
                  }}>
                    Crear cuenta gratis
                  </Button>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ───── STATS BAR ───── */}
      <section style={{ background: '#fff', padding: '40px 0', borderBottom: '1px solid #eee' }}>
        <Container>
          <Row className="text-center">
            {[
              { num: '10K+', label: 'Mensajes enviados' },
              { num: '99.9%', label: 'Uptime garantizado' },
              { num: '24/7', label: 'Soporte técnico' },
              { num: '< 1s', label: 'Tiempo de entrega' },
            ].map((s, i) => (
              <Col xs={6} md={3} key={i} className="mb-3 mb-md-0">
                <h2 style={{ fontWeight: 800, color: '#0a827f', fontSize: '2rem', marginBottom: 4 }}>{s.num}</h2>
                <p style={{ color: '#888', margin: 0, fontSize: '0.95rem' }}>{s.label}</p>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ───── FEATURES ───── */}
      <section id="features" className="section-responsive" style={{ padding: 'clamp(40px, 8vw, 80px) 0', background: '#f8f9fa' }}>
        <Container>
          <div className="text-center mb-5">
            <Badge bg="success" style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: 20, marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <HiSparkles /> Funcionalidades
            </Badge>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', color: '#222' }}>Todo lo que necesitas para tu negocio</h2>
            <p style={{ color: '#666', fontSize: '1.15rem', maxWidth: 600, margin: '16px auto 0' }}>
              Una plataforma completa para gestionar tus comunicaciones por WhatsApp de forma profesional y escalable.
            </p>
          </div>
          <Row>
            {features.map((f, i) => (
              <Col md={6} lg={3} key={i} className="mb-4">
                <Card className="feature-card" style={{
                  border: 'none', borderRadius: 16, height: '100%',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)', transition: 'transform 0.2s, box-shadow 0.2s',
                }}>
                  <Card.Body className="p-4 text-center text-md-start">
                    <div className="d-flex justify-content-center justify-content-md-start">
                      <div style={{
                        width: 60, height: 60, borderRadius: 14,
                        background: `${f.color}15`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: f.color, marginBottom: 16,
                      }}>
                        {f.icon}
                      </div>
                    </div>
                    <h5 style={{ fontWeight: 700, color: '#222', marginBottom: 10 }}>{f.title}</h5>
                    <p style={{ color: '#666', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ───── PLANS ───── */}
      <section id="plans" className="section-responsive" style={{ padding: 'clamp(40px, 8vw, 80px) 0', background: '#fff' }}>
        <Container>
          <div className="text-center mb-5">
            <Badge style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: 20, marginBottom: 16, background: '#0a827f', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FaGem /> Planes
            </Badge>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', color: '#222' }}>Un solo plan, todo incluido</h2>
            <p style={{ color: '#666', fontSize: '1.15rem', maxWidth: 600, margin: '16px auto 0' }}>
              Sin letras pequeñas. Accede a todas las funcionalidades con nuestro plan Premium.
            </p>
          </div>
          <Row className="justify-content-center">
            <Col md={8} lg={6}>
              <Card style={{
                border: '3px solid #0a827f', borderRadius: 24, overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(10,130,127,0.15)',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #0a827f, #0d9e9a)',
                  padding: '30px 24px', textAlign: 'center', color: 'white',
                }}>
                  <Badge bg="warning" text="dark" className="mb-2" style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <FaStar /> MÁS POPULAR
                  </Badge>
                  <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Plan Premium</h3>
                  <div style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 800, lineHeight: 1 }}>
                    $88.000 <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.8 }}>COP/mes</span>
                  </div>
                  <p style={{ opacity: 0.85, marginTop: 8, marginBottom: 0 }}>Todo incluido, sin límites ocultos</p>
                </div>
                <Card.Body className="p-4">
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {planFeatures.map((feat, i) => (
                      <li key={i} style={{
                        padding: '10px 0',
                        borderBottom: i < planFeatures.length - 1 ? '1px solid #f0f0f0' : 'none',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <FaCheck style={{ color: '#0a827f', flexShrink: 0 }} />
                        <span style={{ color: '#444', fontSize: '0.95rem' }}>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => setShowRegisterModal(true)} className="w-100 mt-4" size="lg" style={{
                    background: 'linear-gradient(135deg, #f39c12, #e67e22)', border: 'none',
                    borderRadius: 14, padding: '14px', fontWeight: 700, fontSize: '1.1rem',
                    boxShadow: '0 4px 20px rgba(243,156,18,0.3)',
                  }}>
                    Comenzar ahora <FaArrowRight style={{ marginLeft: 8 }} />
                  </Button>
                  <p className="text-center mt-3" style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
                    <FaShieldAlt className="me-1" /> Pago seguro con MercadoPago · Cancela cuando quieras
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ───── CTA FINAL ───── */}
      <section style={{
        padding: 'clamp(40px, 8vw, 80px) 0',
        background: 'linear-gradient(135deg, #0a827f 0%, #0d9e9a 50%, #25D366 100%)',
        textAlign: 'center', color: 'white',
      }}>
        <Container>
          <FaBolt size={48} style={{ opacity: 0.6, marginBottom: 20 }} />
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', marginBottom: 16 }}>
            ¿Listo para transformar tu comunicación?
          </h2>
          <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: 600, margin: '0 auto 32px' }}>
            Únete a las empresas que ya están potenciando su negocio con EMW.
            Comienza gratis y escala cuando lo necesites.
          </p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Button size="lg" onClick={() => setShowRegisterModal(true)} style={{
              background: 'linear-gradient(135deg, #f39c12, #e67e22)', border: 'none',
              borderRadius: 30, padding: '14px 40px', fontWeight: 700, fontSize: '1.1rem',
              boxShadow: '0 4px 20px rgba(243,156,18,0.4)',
            }}>
              Crear cuenta gratis
            </Button>
            <Button variant="outline-light" size="lg" onClick={() => setShowLoginModal(true)} style={{
              borderRadius: 30, padding: '14px 40px', fontWeight: 600, fontSize: '1.05rem', borderWidth: 2,
            }}>
              Ya tengo cuenta
            </Button>
          </div>
        </Container>
      </section>

      {/* ───── FOOTER ───── */}
      <footer style={{ background: '#1a1a2e', color: 'rgba(255,255,255,0.6)', padding: '40px 0', textAlign: 'center' }}>
        <Container>
          <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
            <Image src={logo} alt="EMW" width={32} height={32} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>EMW</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            © {new Date().getFullYear()} EMW — Enterprise WhatsApp Messaging by{' '}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/cauce-symbol.svg" alt="" width={18} height={18} style={{ borderRadius: 4 }} />
            <a href="https://www.humanizar.co" target="_blank" rel="noopener noreferrer" style={{ color: '#0a827f' }}>Olympo</a>
          </p>
        </Container>
      </footer>

      {/* ───── MODAL LOGIN ───── */}
      <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)} centered>
        <Modal.Header closeButton style={{ border: 'none', paddingBottom: 0 }}>
          <Modal.Title className="w-100 text-center" style={{ fontWeight: 700 }}>
            <Image src={logo} alt="EMW" width={48} height={48} /><br />
            Iniciar sesión
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 pb-4">
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="formLoginEmail" className="mb-3">
              <Form.Control placeholder="Correo electrónico" type="text" value={email}
                onChange={e => setEmail(e.target.value)} style={{ borderRadius: 10, padding: '12px 16px' }} />
            </Form.Group>
            <Form.Group controlId="formLoginPassword" className="mb-3">
              <Form.Control placeholder="Contraseña" type="password" value={password}
                onChange={e => setPassword(e.target.value)} style={{ borderRadius: 10, padding: '12px 16px' }} />
            </Form.Group>
            <Button className="w-100 mb-3" type="submit" disabled={isLoading} style={{
              background: '#0a827f', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 600,
            }}>
              {isLoading ? 'Cargando...' : 'Iniciar sesión'}
            </Button>
            <Button className="w-100 mb-2" variant="secondary" style={{ borderRadius: 10, padding: '12px' }}
              onClick={() => { setShowLoginModal(false); setShowProviderModal(true); }}>
              Continuar con Google, Apple, Facebook o Microsoft
            </Button>
            <div className="text-center mt-2">
              <Button variant="link" size="sm" style={{ color: '#0a827f' }}
                onClick={() => { setShowLoginModal(false); setShowPasswordResetModal(true); }}>
                ¿Olvidaste tu contraseña?
              </Button>
            </div>
            <hr />
            <div className="text-center">
              <span style={{ color: '#888', fontSize: '0.9rem' }}>¿No tienes cuenta? </span>
              <Button variant="link" size="sm" style={{ color: '#0a827f', fontWeight: 600 }}
                onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }}>
                Regístrate
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ───── MODAL PROVIDERS ───── */}
      <Modal show={showProviderModal} onHide={() => setShowProviderModal(false)} centered>
        <Modal.Header closeButton style={{ border: 'none' }}>
          <Modal.Title className="w-100 text-center" style={{ fontWeight: 700 }}>Elige un proveedor</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex flex-column align-items-center px-4 pb-4">
          <Button className="w-100 btn-secondary mb-3 d-flex align-items-center" style={{ borderRadius: 10, padding: '12px 16px' }}
            onClick={() => handleLoginWithProvider('google')}>
            <FcGoogle size={24} />
            <span className="flex-grow-1 text-center">Continuar con Google</span>
          </Button>
          <Button disabled className="w-100 btn-secondary mb-3 d-flex align-items-center" style={{ borderRadius: 10, padding: '12px 16px' }}
            onClick={() => handleLoginWithProvider('apple')}>
            <FaApple size={24} />
            <span className="flex-grow-1 text-center">Continuar con Apple</span>
          </Button>
          <Button disabled className="w-100 btn-secondary mb-3 d-flex align-items-center" style={{ borderRadius: 10, padding: '12px 16px' }}
            onClick={() => handleLoginWithProvider('microsoft')}>
            <FaMicrosoft size={24} style={{ color: '#F3BA2F' }} />
            <span className="flex-grow-1 text-center">Continuar con Microsoft</span>
          </Button>
          <Button disabled className="w-100 btn-secondary d-flex align-items-center" style={{ borderRadius: 10, padding: '12px 16px' }}
            onClick={() => handleLoginWithProvider('facebook')}>
            <FaFacebook size={24} style={{ color: '#4267B2' }} />
            <span className="flex-grow-1 text-center">Continuar con Facebook</span>
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <>
              <hr className="w-100" />
              <Button className="w-100 btn-warning d-flex align-items-center justify-content-center gap-2" onClick={autoLoginForDev}>
                <FaWrench /> Auto-Login (Desarrollo)
              </Button>
            </>
          )}
        </Modal.Body>
      </Modal>

      <Register show={showRegisterModal} handleClose={() => setShowRegisterModal(false)} />

      <PasswordResetModal
        show={showPasswordResetModal}
        handleClose={() => setShowPasswordResetModal(false)}
        handlePasswordReset={handlePasswordReset}
      />

      <style jsx global>{`
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.1) !important;
        }
        @media (max-width: 991px) {
          #hero .btn-lg {
            width: 100%;
            justify-content: center;
          }
        }
        @media (max-width: 767px) {
          .hero-login-card {
            padding: 24px !important;
          }
          #hero .container {
            padding-left: 16px;
            padding-right: 16px;
          }
        }
        @media (max-width: 575px) {
          nav .btn-sm {
            padding: 5px 12px !important;
            font-size: 0.82rem !important;
          }
        }
      `}</style>
    </>
  );
};

export default Landing;
