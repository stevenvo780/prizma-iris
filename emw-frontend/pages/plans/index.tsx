import React, { useState, useEffect } from 'react';
import SeoHead from '@components/SeoHead';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { withAuthSync } from '@utils/auth';
import PaymentForm from '@components/payment/PaymentForm';
import usePayments from '@store/payments';
import useUser from '@store/user';
import { UserRoleOptions } from '@utils/types';

interface PaymentRecord {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  paymentMethod?: string;
}

const PlansPage: React.FC = () => {
  const [lastPayment, setLastPayment] = useState<PaymentRecord | null>(null);
  const { getPaymentHistory } = usePayments();
  const { user } = useUser();

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        const history = await getPaymentHistory();
        if (history && history.length > 0) {
          const approved = history.find((p: PaymentRecord) => p.status === 'approved');
          if (approved) setLastPayment(approved);
        }
      } catch (err) {
        // Silently ignore - no payment history is fine for new users
      }
    };

    fetchPaymentHistory();
  }, []);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  const isPremium = user?.role === UserRoleOptions.PREMIUM;

  return (
    <>
      <SeoHead title="Planes" description="Conoce el Plan Premium de Iris: WhatsApp Business API, mensajes masivos ilimitados y soporte dedicado." pathname="/plans" />
    <Container className='py-5'>
      <div className='text-center mb-5'>
        <h1 className='display-4 fw-bold'>Plan Premium</h1>
        <p className='lead text-muted'>Potencia tu negocio con nuestro plan exclusivo</p>
        <hr className='my-4' style={{ width: '50%', margin: '0 auto', borderColor: '#0a827f' }} />
      </div>

      <Row className='justify-content-center'>
        <Col lg={10}>
          <PaymentForm
            planTitle='Plan Especial'
            planPrice='88.000'
            onPaymentSuccess={() => {}}
            onPaymentError={error => console.error('Error en el pago:', error)}
            onCancelSubscription={() => {}}
          />
        </Col>
      </Row>

      {isPremium && lastPayment && (
        <Row className='justify-content-center mt-5'>
          <Col lg={10}>
            <Card className='border-0 shadow-sm'>
              <Card.Body className='text-center p-4'>
                <div className='icon-container mb-3'>
                  <i className='fas fa-calendar-check fa-3x text-success'></i>
                </div>
                <h3 className='text-success'>Plan Activo</h3>
                <p className='lead'>
                  <strong>
                    Último pago: {formatDate(lastPayment.createdAt)} — ${lastPayment.amount.toLocaleString('es-CO')} {lastPayment.currency}
                  </strong>
                </p>
                <div className='bg-light p-3 rounded mb-3'>
                  <i className='fas fa-check-circle me-2 text-success'></i>
                  Tu plan premium está activo. Disfruta de todas las funcionalidades.
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
    </>
  );
};

export default withAuthSync(PlansPage);

export async function getServerSideProps(context: any) {
  return { props: {} };
}
