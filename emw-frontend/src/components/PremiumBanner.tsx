import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Modal, ProgressBar } from 'react-bootstrap';
import useUser from '@store/user';
import usePayments from '@store/payments';
import PaymentForm from './payment/PaymentForm';

interface UsageLimits {
  plan: string;
  customers: { current: number; max: number | null; remaining: number | null };
  messagesPerDay: { sent: number; max: number | null; remaining: number | null };
}

const PremiumBanner: React.FC = () => {
  const { user, token } = useUser();
  const { getUsageLimits } = usePayments();
  const [showModal, setShowModal] = useState(false);
  const [limits, setLimits] = useState<UsageLimits | null>(null);

  useEffect(() => {
    if (user?.role === 'user' && token) {
      getUsageLimits().then((data: UsageLimits | null) => {
        if (data) setLimits(data);
      });
    }
  }, [user?.role, token]);

  if (!user || user.role !== 'user') {
    return null;
  }

  const handleClose = () => setShowModal(false);
  const handleShow = () => setShowModal(true);

  const customerPct = limits?.customers?.max
    ? Math.round((limits.customers.current / limits.customers.max) * 100)
    : 0;
  const messagePct = limits?.messagesPerDay?.max
    ? Math.round((limits.messagesPerDay.sent / limits.messagesPerDay.max) * 100)
    : 0;

  return (
    <>
      <div
        className='py-2'
        style={{
          backgroundColor: '#FFF9C4',
          borderBottom: '1px solid #FFE082',
        }}
      >
        <Container>
          <Row className='align-items-center'>
            <Col xs={12} md={5} className='d-flex align-items-center'>
              <i className='fas fa-star text-warning me-2' style={{ fontSize: '1.2rem' }}></i>
              <span className='me-2'>
                <strong>Plan Gratis:</strong> Tu cuenta tiene funcionalidades limitadas.
              </span>
              <span className='d-none d-md-inline'>
                Actualiza a Premium para disfrutar de soporte prioritario, mensajes y clientes
                ilimitados.
              </span>
            </Col>
            {limits && (
              <Col xs={12} md={4} className='mt-1 mt-md-0'>
                <div className='d-flex gap-3 align-items-center' style={{ fontSize: '0.8rem' }}>
                  <div className='flex-fill'>
                    <span className='text-muted'>Clientes: {limits.customers.current}/{limits.customers.max}</span>
                    <ProgressBar
                      now={customerPct}
                      variant={customerPct >= 90 ? 'danger' : customerPct >= 70 ? 'warning' : 'info'}
                      style={{ height: '6px' }}
                    />
                  </div>
                  <div className='flex-fill'>
                    <span className='text-muted'>Msgs hoy: {limits.messagesPerDay.sent}/{limits.messagesPerDay.max}</span>
                    <ProgressBar
                      now={messagePct}
                      variant={messagePct >= 90 ? 'danger' : messagePct >= 70 ? 'warning' : 'info'}
                      style={{ height: '6px' }}
                    />
                  </div>
                </div>
              </Col>
            )}
            <Col xs={12} md={3} className='text-md-end mt-2 mt-md-0'>
              <Button variant='warning' size='sm' className='fw-bold px-3' onClick={handleShow}>
                <i className='fas fa-crown me-1'></i> Actualizar a Premium
              </Button>
            </Col>
          </Row>
        </Container>
      </div>

      <Modal show={showModal} onHide={handleClose} size='lg'>
        <Modal.Header closeButton>
          <Modal.Title>Actualiza a Plan Premium</Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-0'>
          <PaymentForm
            planTitle='Plan Especial'
            planPrice='88.000'
            onPaymentSuccess={handleClose}
            onPaymentError={() => {}}
          />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default PremiumBanner;
