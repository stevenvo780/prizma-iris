import React, { useState, FormEvent } from 'react';
import { Button, Card, CardBody, Modal, Badge, Input } from 'prizma-ui';
import Image from 'next/image';
import {
  FaApple, FaMicrosoft, FaFacebook, FaWhatsapp, FaUsers, FaChartLine,
  FaRobot, FaFileAlt, FaComments, FaCheck, FaBolt, FaShieldAlt,
  FaTags, FaPaperPlane, FaArrowRight, FaRocket, FaStar, FaGem, FaWrench,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';
import useUser from '@store/user';
import useUI from '@store/ui';
import { ProviderName } from '@utils/firebase.config';
import Register from '@components/auth/Register';
import PasswordResetModal from '@components/auth/PasswordResetModal';
import Events from '@components/Events';
import SeoHead from '@components/SeoHead';

// Wordmark: dark version for light backgrounds, light for dark
const WORDMARK_DARK = '/img/prizma-wordmark.png';
const WORDMARK_LIGHT = '/img/prizma-wordmark-light.png';

const features = [
  { icon: <FaWhatsapp size={36} />, title: 'WhatsApp Business API', desc: 'Conecta tu cuenta oficial de WhatsApp Business y gestiona todas las conversaciones desde un solo lugar.', color: '#25D366' },
  { icon: <FaPaperPlane size={36} />, title: 'Mensajes Masivos', desc: 'Envía campañas a miles de clientes con plantillas aprobadas, segmentación por etiquetas y métricas en tiempo real.', color: '#0066CC' },
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
  const { loginWithProvider, loginWithBackend, resetPassword, autoLoginForDev } = useUser();
  const { addAlert } = useUI();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      addAlert({ type: 'warning', message: 'Por favor, ingresa tu correo electrónico y contraseña.' });
      return;
    }
    setIsLoading(true);
    await loginWithBackend(email, password);
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
      <SeoHead
        title="PRIZMA · Iris Login"
        description="Inicia sesión en Iris · Plataforma PRIZMA — WhatsApp Business API: gestiona conversaciones, envía campañas masivas y automatiza respuestas para hacer crecer tu negocio."
        pathname="/login"
      />
      <Events />

      {/* ───── NAVBAR ───── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '12px 0',
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Wordmark — replaces old iris-logo */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}
            onClick={() => scrollTo('hero')}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && scrollTo('hero')}
            aria-label="Ir al inicio"
          >
            <Image
              src={WORDMARK_DARK}
              alt="PRIZMA · Iris"
              width={160}
              height={48}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          {/* Nav links — changed from <a onClick> to <button> for keyboard + SR accessibility */}
          <div className="d-none d-md-flex" style={{ gap: 32, alignItems: 'center' }}>
            <button
              onClick={() => scrollTo('features')}
              style={{ cursor: 'pointer', color: '#555', fontWeight: 500, background: 'none', border: 'none', padding: '4px 0', fontSize: '1rem' }}
              type="button"
            >
              Funcionalidades
            </button>
            <button
              onClick={() => scrollTo('plans')}
              style={{ cursor: 'pointer', color: '#555', fontWeight: 500, background: 'none', border: 'none', padding: '4px 0', fontSize: '1rem' }}
              type="button"
            >
              Planes
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowLoginModal(true)}
              style={{ borderRadius: 20, padding: '6px 16px', border: '2px solid #0066CC', color: '#0066CC', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              <span className="d-none d-sm-inline">Iniciar sesión</span>
              <span className="d-sm-none">Entrar</span>
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowRegisterModal(true)}
              style={{ borderRadius: 20, padding: '6px 16px', background: '#0066CC', border: 'none', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              <span className="d-none d-sm-inline">Registrarse</span>
              <span className="d-sm-none">Registro</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <section id="hero" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        paddingTop: 80, paddingBottom: 40,
        background: 'linear-gradient(135deg, #003d7a 0%, #0052A3 40%, #0066CC 70%, #3385D6 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 40%)',
        }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="row align-items-center">
            <div className="col-lg-7 text-white mb-5 mb-lg-0 text-center text-lg-start">
              <Badge tone="neutral" className="mb-3" style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FaRocket style={{ color: '#0066CC' }} /> WhatsApp Business API al mejor precio
              </Badge>
              {/* SEO H1 */}
              <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 24 }}>
                Inicia sesión en Iris{' '}
                <span style={{ display: 'block', fontSize: '0.75em', fontWeight: 400, opacity: 0.85, marginTop: 8 }}>
                  Plataforma PRIZMA
                </span>
              </h1>
              <p style={{ fontSize: '1.2rem', opacity: 0.92, lineHeight: 1.7, marginBottom: 32, maxWidth: 560, margin: '0 auto 32px' }}>
                Gestiona conversaciones, envía campañas masivas, automatiza respuestas y haz crecer tu negocio
                con la plataforma más completa de WhatsApp Business API.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }} className="justify-content-lg-start">
                {/* CTA con texto oscuro sobre fondo naranja — WCAG AA fix */}
                <Button
                  size="lg"
                  variant="accent"
                  onClick={() => setShowRegisterModal(true)}
                  rightIcon={<FaArrowRight />}
                  style={{
                    background: 'linear-gradient(135deg, #f39c12, #e67e22)', border: 'none',
                    borderRadius: 30, padding: '14px 36px', fontWeight: 700, fontSize: '1.1rem',
                    boxShadow: '0 4px 20px rgba(243,156,18,0.4)',
                    color: '#1a1a1a',
                  }}
                >
                  Comenzar gratis
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => scrollTo('features')}
                  style={{ borderRadius: 30, padding: '14px 36px', fontWeight: 600, fontSize: '1.05rem', border: '2px solid white', color: 'white' }}
                >
                  Ver funcionalidades
                </Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16, opacity: 0.8, fontSize: '0.9rem' }} className="justify-content-center justify-content-lg-start">
                <span><FaCheck className="me-1" /> CRM integrado</span>
                <span><FaCheck className="me-1" /> Soporte técnico dedicado</span>
                <span><FaCheck className="me-1" /> Configuración en minutos</span>
              </div>
            </div>
            <div className="col-lg-5 text-center">
              <div className="hero-login-card" style={{
                background: 'rgba(255,255,255,0.12)', borderRadius: 24, padding: 40,
                backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              }}>
                {/* Wordmark light (white) for dark hero background */}
                <Image
                  src={WORDMARK_LIGHT}
                  alt="PRIZMA · Iris"
                  width={180}
                  height={54}
                  style={{ objectFit: 'contain' }}
                  priority
                />
                <h3 className="text-white mt-3 mb-2" style={{ fontWeight: 700 }}>PRIZMA · Iris</h3>
                <p className="text-white mb-4" style={{ opacity: 0.85 }}>Enterprise WhatsApp Messaging</p>
                <div style={{ display: 'grid', gap: 8 }}>
                  <Button
                    onClick={() => setShowLoginModal(true)}
                    variant="secondary"
                    block
                    style={{
                      background: 'white', color: '#0066CC', border: 'none',
                      borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: '1.05rem',
                    }}
                  >
                    Iniciar sesión
                  </Button>
                  <Button
                    onClick={() => setShowRegisterModal(true)}
                    variant="accent"
                    block
                    style={{
                      background: 'linear-gradient(135deg, #f39c12, #e67e22)', border: 'none',
                      borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: '1.05rem',
                      color: '#1a1a1a',
                    }}
                  >
                    Crear cuenta gratis
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── STATS BAR ───── */}
      <section style={{ background: '#fff', padding: '40px 0', borderBottom: '1px solid #eee' }}>
        <div className="container">
          <div className="row text-center">
            {[
              { label: '✓ Mensajería a escala global' },
              { label: '✓ Entrega confiable y rápida' },
              { label: '✓ Soporte profesional 24/7' },
              { label: '✓ Plataforma escalable y segura' },
            ].map((s, i) => (
              <div className="col-6 col-md-3 mb-3 mb-md-0" key={i}>
                <p style={{ color: '#0066CC', margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section id="features" className="section-responsive" style={{ padding: 'clamp(40px, 8vw, 80px) 0', background: '#f8f9fa' }}>
        <div className="container">
          <div className="text-center mb-5">
            <Badge tone="success" style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: 20, marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <HiSparkles /> Funcionalidades
            </Badge>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', color: '#222' }}>Todo lo que necesitas para tu negocio</h2>
            <p style={{ color: '#666', fontSize: '1.15rem', maxWidth: 600, margin: '16px auto 0' }}>
              Una plataforma completa para gestionar tus comunicaciones por WhatsApp de forma profesional y escalable.
            </p>
          </div>
          <div className="row">
            {features.map((f, i) => (
              <div className="col-md-6 col-lg-3 mb-4" key={i}>
                <Card
                  className="feature-card"
                  style={{
                    border: 'none', borderRadius: 16, height: '100%',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)', transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <CardBody style={{ padding: 24, textAlign: 'center' }} className="text-md-start">
                    <div style={{ display: 'flex', justifyContent: 'center' }} className="justify-content-md-start">
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
                  </CardBody>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── PLANS ───── */}
      <section id="plans" className="section-responsive" style={{ padding: 'clamp(40px, 8vw, 80px) 0', background: '#fff' }}>
        <div className="container">
          <div className="text-center mb-5">
            <Badge tone="primary" style={{ fontSize: '0.85rem', padding: '8px 16px', borderRadius: 20, marginBottom: 16, background: '#0066CC', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FaGem /> Planes
            </Badge>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', color: '#222' }}>Un solo plan, todo incluido</h2>
            <p style={{ color: '#666', fontSize: '1.15rem', maxWidth: 600, margin: '16px auto 0' }}>
              Sin letras pequeñas. Accede a todas las funcionalidades con nuestro plan Premium.
            </p>
          </div>
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              <Card style={{
                border: '3px solid #0066CC', borderRadius: 24, overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0,102,204,0.15)',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #003d7a, #0066CC)',
                  padding: '30px 24px', textAlign: 'center', color: 'white',
                }}>
                  <Badge tone="warning" className="mb-2" style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <FaStar /> MÁS POPULAR
                  </Badge>
                  <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Plan Premium</h3>
                  <div style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 800, lineHeight: 1 }}>
                    $88.000 <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.8 }}>COP/mes</span>
                  </div>
                  <p style={{ opacity: 0.85, marginTop: 8, marginBottom: 0 }}>Todo incluido, sin límites ocultos</p>
                </div>
                <CardBody style={{ padding: 24 }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {planFeatures.map((feat, i) => (
                      <li key={i} style={{
                        padding: '10px 0',
                        borderBottom: i < planFeatures.length - 1 ? '1px solid #f0f0f0' : 'none',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <FaCheck style={{ color: '#0066CC', flexShrink: 0 }} />
                        <span style={{ color: '#444', fontSize: '0.95rem' }}>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  {/* CTA with WCAG-compliant dark text on orange */}
                  <Button
                    onClick={() => setShowRegisterModal(true)}
                    variant="accent"
                    block
                    size="lg"
                    rightIcon={<FaArrowRight />}
                    style={{
                      background: 'linear-gradient(135deg, #f39c12, #e67e22)', border: 'none',
                      borderRadius: 14, padding: '14px', fontWeight: 700, fontSize: '1.1rem',
                      boxShadow: '0 4px 20px rgba(243,156,18,0.3)', marginTop: 16,
                      color: '#1a1a1a',
                    }}
                  >
                    Comenzar ahora
                  </Button>
                  <p className="text-center mt-3" style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>
                    <FaShieldAlt className="me-1" /> Pago seguro con MercadoPago · Cancela cuando quieras
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ───── CTA FINAL ───── */}
      <section style={{
        padding: 'clamp(40px, 8vw, 80px) 0',
        background: 'linear-gradient(135deg, #003d7a 0%, #0066CC 50%, #3385D6 100%)',
        textAlign: 'center', color: 'white',
      }}>
        <div className="container">
          <FaBolt size={48} style={{ opacity: 0.6, marginBottom: 20 }} />
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', marginBottom: 16 }}>
            ¿Listo para transformar tu comunicación?
          </h2>
          <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: 600, margin: '0 auto 32px' }}>
            Únete a las empresas que ya están potenciando su negocio con PRIZMA · Iris.
            Comienza gratis y escala cuando lo necesites.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* CTA with WCAG-compliant dark text on orange */}
            <Button
              size="lg"
              variant="accent"
              onClick={() => setShowRegisterModal(true)}
              style={{
                background: 'linear-gradient(135deg, #f39c12, #e67e22)', border: 'none',
                borderRadius: 30, padding: '14px 40px', fontWeight: 700, fontSize: '1.1rem',
                boxShadow: '0 4px 20px rgba(243,156,18,0.4)',
                color: '#1a1a1a',
              }}
            >
              Crear cuenta gratis
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowLoginModal(true)}
              style={{ borderRadius: 30, padding: '14px 40px', fontWeight: 600, fontSize: '1.05rem', border: '2px solid white', color: 'white' }}
            >
              Ya tengo cuenta
            </Button>
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer style={{ background: '#1a1a2e', color: 'rgba(255,255,255,0.6)', padding: '40px 0', textAlign: 'center' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <Image src={WORDMARK_LIGHT} alt="PRIZMA · Iris" width={140} height={42} style={{ objectFit: 'contain' }} />
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            © {new Date().getFullYear()} PRIZMA · Iris — Enterprise WhatsApp Messaging.{' '}
            <a href="https://prisma-enterprise.cloud" target="_blank" rel="noopener noreferrer" style={{ color: '#3385D6' }}>prisma-enterprise.cloud</a>
          </p>
        </div>
      </footer>

      {/* ───── MODAL LOGIN ───── */}
      <Modal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title={
          <div style={{ textAlign: 'center', fontWeight: 700, width: '100%' }}>
            <Image src={WORDMARK_DARK} alt="PRIZMA · Iris" width={140} height={42} style={{ objectFit: 'contain' }} /><br />
            Iniciar sesión
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ padding: '0 8px 8px' }}>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor='login-email' style={{ display: 'block', marginBottom: 4, fontSize: '0.875rem', fontWeight: 500 }}>
              Correo electrónico
            </label>
            <Input
              id='login-email'
              placeholder="Correo electrónico"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ borderRadius: 10, padding: '12px 16px' }}
              required
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor='login-password' style={{ display: 'block', marginBottom: 4, fontSize: '0.875rem', fontWeight: 500 }}>
              Contraseña
            </label>
            <Input
              id='login-password'
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ borderRadius: 10, padding: '12px 16px' }}
              required
            />
          </div>
          <Button
            block
            type="submit"
            disabled={isLoading}
            variant="primary"
            style={{ background: '#0066CC', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 600, marginBottom: 8 }}
          >
            {isLoading ? 'Cargando...' : 'Iniciar sesión'}
          </Button>
          <Button
            block
            variant="secondary"
            style={{ borderRadius: 10, padding: '12px', marginBottom: 8 }}
            onClick={() => { setShowLoginModal(false); setShowProviderModal(true); }}
          >
            Continuar con Google, Apple, Facebook o Microsoft
          </Button>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Button
              variant="link"
              size="sm"
              style={{ color: '#0066CC' }}
              onClick={() => { setShowLoginModal(false); setShowPasswordResetModal(true); }}
            >
              ¿Olvidaste tu contraseña?
            </Button>
          </div>
          <hr />
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#888', fontSize: '0.9rem' }}>¿No tienes cuenta? </span>
            <Button
              variant="link"
              size="sm"
              style={{ color: '#0066CC', fontWeight: 600 }}
              onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }}
            >
              Regístrate
            </Button>
          </div>
        </form>
      </Modal>

      {/* ───── MODAL PROVIDERS ───── */}
      <Modal
        open={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        title={<div style={{ textAlign: 'center', fontWeight: 700, width: '100%' }}>Elige un proveedor</div>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px 8px' }}>
          <Button
            block
            variant="secondary"
            style={{ borderRadius: 10, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center' }}
            onClick={() => handleLoginWithProvider('google')}
          >
            <FcGoogle size={24} />
            <span style={{ flexGrow: 1, textAlign: 'center' }}>Continuar con Google</span>
          </Button>
          <Button
            disabled
            block
            variant="secondary"
            style={{ borderRadius: 10, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center' }}
            onClick={() => handleLoginWithProvider('apple')}
          >
            <FaApple size={24} />
            <span style={{ flexGrow: 1, textAlign: 'center' }}>Continuar con Apple</span>
          </Button>
          <Button
            disabled
            block
            variant="secondary"
            style={{ borderRadius: 10, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center' }}
            onClick={() => handleLoginWithProvider('microsoft')}
          >
            <FaMicrosoft size={24} style={{ color: '#F3BA2F' }} />
            <span style={{ flexGrow: 1, textAlign: 'center' }}>Continuar con Microsoft</span>
          </Button>
          <Button
            disabled
            block
            variant="secondary"
            style={{ borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center' }}
            onClick={() => handleLoginWithProvider('facebook')}
          >
            <FaFacebook size={24} style={{ color: '#4267B2' }} />
            <span style={{ flexGrow: 1, textAlign: 'center' }}>Continuar con Facebook</span>
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <>
              <hr style={{ width: '100%' }} />
              <Button
                block
                variant="accent"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={autoLoginForDev}
              >
                <FaWrench /> Auto-Login (Desarrollo)
              </Button>
            </>
          )}
        </div>
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

export async function getServerSideProps(context: any) {
  return { props: {} };
}
