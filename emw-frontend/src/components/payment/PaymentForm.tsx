import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Button,
  Modal,
  Spinner,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
} from 'react-bootstrap';
import RingLoader from 'react-spinners/RingLoader';
import usePayments from '@store/payments';
import useUser from '@store/user';
import useUI from '@store/ui';
import { UserRoleOptions, PaymentPeriodicity } from '@utils/types';

interface PaymentFormProps {
  planTitle?: string;
  planPrice?: string;
  onPaymentSuccess?: () => void;
  onPaymentError?: (error: any) => void;
  onCancelSubscription?: () => void;
}

const override: any = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 9999,
};

const PaymentForm: React.FC<PaymentFormProps> = ({
  planTitle = 'Plan Especial',
  planPrice = '88.000',
  onPaymentSuccess,
  onPaymentError,
  onCancelSubscription,
}) => {
  const { createPreference, cancelSubscription, getSubscriptionStatus } = usePayments();
  const { user, token } = useUser();
  const { setLoading, addAlert } = useUI();
  const [loading, setLoadingLocal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [billingCycle, setBillingCycle] = useState<PaymentPeriodicity>(PaymentPeriodicity.MONTHLY);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loadingPreference, setLoadingPreference] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  const planUser = user?.role || null;

  // Obtener estado de suscripción
  useEffect(() => {
    if (token && planUser === UserRoleOptions.PREMIUM) {
      getSubscriptionStatus().then((data: any) => {
        if (data) setSubscriptionInfo(data);
      });
    }
  }, [token, planUser]);

  // Detectar status en URL (retorno de Mercado Pago)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('status');
      if (status) {
        setPaymentStatus(status);
        if (status === 'approved') {
          addAlert({ type: 'success', message: '¡Pago aprobado exitosamente! Tu plan premium está activo.' });
          if (onPaymentSuccess) onPaymentSuccess();
        } else if (status === 'rejected') {
          addAlert({ type: 'danger', message: 'El pago fue rechazado. Intenta de nuevo.' });
          if (onPaymentError) onPaymentError('Payment rejected');
        } else if (status === 'pending') {
          addAlert({ type: 'warning', message: 'El pago está pendiente de confirmación.' });
        }
        // Limpiar URL params
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleCreatePreference = async () => {
    if (hasSpecialPlan()) {
      addAlert({ type: 'danger', message: 'Ya tienes este plan' });
      return;
    }

    setLoadingPreference(true);
    try {
      const periodicity = billingCycle === PaymentPeriodicity.ANNUAL ? 'annual' : 'monthly';
      const result = await createPreference('premium', periodicity);

      if (result?.initPoint) {
        // Redirigir directamente al checkout de Mercado Pago
        window.location.href = result.initPoint;
      } else if (result?.preferenceId) {
        setPreferenceId(result.preferenceId);
        addAlert({ type: 'warning', message: 'No se pudo obtener el enlace de pago. Intenta de nuevo.' });
      } else {
        addAlert({ type: 'danger', message: 'Error al preparar el pago. Intenta de nuevo.' });
      }
    } catch (error) {
      console.error('Error creating preference:', error);
      addAlert({ type: 'danger', message: 'Error al preparar el pago.' });
    } finally {
      setLoadingPreference(false);
    }
  };

  const handleCancel = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowCancelModal(true);
  };

  const confirmCancelSubscription = async () => {
    setLoading(true);
    setLoadingLocal(true);

    try {
      const result = await cancelSubscription();
      if (result?.subscriptionExpiresAt) {
        // Suscripción cancelada pero sigue activa hasta la fecha
        setSubscriptionInfo({
          ...subscriptionInfo,
          isCancelled: true,
          subscriptionExpiresAt: result.subscriptionExpiresAt,
          daysRemaining: result.daysRemaining,
        });
      }
      if (onCancelSubscription) onCancelSubscription();
    } catch (error) {
      console.error('Error al cancelar suscripción:', error);
      addAlert({ type: 'danger', message: 'Error al cancelar la suscripción' });
    } finally {
      setShowCancelModal(false);
      setLoadingLocal(false);
      setLoading(false);
    }
  };

  const planBenefits = [
    { icon: 'fas fa-check-circle', text: 'Mensajes ilimitados' },
    { icon: 'fas fa-check-circle', text: 'Clientes ilimitados' },
    { icon: 'fas fa-check-circle', text: 'Soporte prioritario' },
    { icon: 'fas fa-check-circle', text: 'Envíos mas rápidos' },
  ];

  const hasSpecialPlan = (): boolean => {
    return planUser !== null && planUser === UserRoleOptions.PREMIUM;
  };

  const calculatePrice = (
    basePrice: string,
    cycle: PaymentPeriodicity,
  ): { displayPrice: string; calculatedPrice: number; period: string; savings: string | null } => {
    const numericPrice = parseFloat(basePrice.replace(/\./g, '').replace(',', '.'));

    if (cycle === PaymentPeriodicity.MONTHLY) {
      return {
        displayPrice: basePrice,
        calculatedPrice: numericPrice,
        period: 'mes',
        savings: null,
      };
    } else {
      const annualPrice = numericPrice * 12 * 0.8;
      const savings = numericPrice * 12 * 0.2;

      return {
        displayPrice: Math.round(annualPrice).toLocaleString('es-CO').replace(/,/g, '.'),
        calculatedPrice: annualPrice,
        period: 'año',
        savings: Math.round(savings).toLocaleString('es-CO').replace(/,/g, '.'),
      };
    }
  };

  const priceInfo = calculatePrice(planPrice, billingCycle);

  const handleBillingCycleChange = (val: PaymentPeriodicity) => {
    setBillingCycle(val);
    setPreferenceId(null); // Reset preference when changing billing cycle
  };

  return (
    <>
      {loading && (
        <RingLoader
          color={'#0066CC'}
          loading={loading}
          cssOverride={override}
          size={100}
          aria-label='Cargando'
          data-testid='loader'
        />
      )}

      {paymentStatus === 'approved' && (
        <Alert variant='success' className='mb-4 text-center'>
          <i className='fas fa-check-circle me-2'></i>
          <strong>¡Pago aprobado!</strong> Tu plan premium está activo.
        </Alert>
      )}

      {paymentStatus === 'pending' && (
        <Alert variant='warning' className='mb-4 text-center'>
          <i className='fas fa-clock me-2'></i>
          <strong>Pago pendiente</strong> — Tu pago está siendo procesado. Te notificaremos cuando se confirme.
        </Alert>
      )}

      {paymentStatus === 'rejected' && (
        <Alert variant='danger' className='mb-4 text-center'>
          <i className='fas fa-times-circle me-2'></i>
          <strong>Pago rechazado</strong> — Intenta con otro método de pago.
        </Alert>
      )}

      <div className='shadow rounded-lg overflow-hidden'>
        {hasSpecialPlan() ? (
          <Row className='g-0'>
            <Col
              md={12}
              style={{
                background: 'linear-gradient(135deg, #003d7a, #0066CC)',
                color: 'white',
                padding: '3rem 2rem',
              }}
            >
              <div className='text-center mb-4'>
                <div className='display-1 mb-3'>
                  <i className='fas fa-star-circle text-warning'></i>
                </div>
                <h2 className='display-5 fw-bold mb-3'>¡Felicidades!</h2>
                <h3 className='h4 mb-4'>Ya tienes activo tu {planTitle}</h3>
              </div>

              <div className='row justify-content-center mb-4'>
                <div className='col-md-8'>
                  <div className='bg-white bg-opacity-10 rounded p-4'>
                    <h4 className='mb-3 fw-bold text-center'>Beneficios que estás disfrutando:</h4>
                    <div className='row'>
                      {planBenefits.map((benefit, index) => (
                        <div key={index} className='col-md-6 mb-3'>
                          <div className='d-flex align-items-center'>
                            <i className={`${benefit.icon} me-3 fs-4 text-warning`}></i>
                            <span className='fs-5'>{benefit.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className='text-center mt-4'>
                {subscriptionInfo?.isCancelled ? (
                  <>
                    <Alert variant='warning' className='bg-warning bg-opacity-25 border-warning text-white'>
                      <i className='fas fa-info-circle me-2'></i>
                      Tu suscripción fue cancelada. Tu plan premium seguirá activo hasta el{' '}
                      <strong>
                        {subscriptionInfo.subscriptionExpiresAt
                          ? new Date(subscriptionInfo.subscriptionExpiresAt).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'fin del período'}
                      </strong>
                      {subscriptionInfo.daysRemaining && (
                        <span> ({subscriptionInfo.daysRemaining} días restantes)</span>
                      )}
                    </Alert>
                  </>
                ) : (
                  <>
                    <p className='mb-2'>
                      Tu suscripción se renovará automáticamente por ${priceInfo.displayPrice}/
                      {priceInfo.period}
                    </p>
                    {subscriptionInfo?.subscriptionExpiresAt && (
                      <p className='small opacity-75 mb-3'>
                        <i className='fas fa-calendar-alt me-1'></i>
                        Próxima renovación:{' '}
                        {new Date(subscriptionInfo.subscriptionExpiresAt).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                        {subscriptionInfo.daysRemaining && (
                          <span> ({subscriptionInfo.daysRemaining} días)</span>
                        )}
                      </p>
                    )}
                    <Button
                      variant='outline-light'
                      size='sm'
                      onClick={handleCancel}
                      className='fw-bold'
                    >
                      <i className='fas fa-times-circle me-2'></i>
                      Cancelar suscripción
                    </Button>
                  </>
                )}
              </div>
            </Col>
          </Row>
        ) : (
          <Row className='g-0'>
            <Col
              md={5}
              style={{
                background: 'linear-gradient(135deg, #003d7a, #0066CC)',
                color: 'white',
                padding: '3rem 2rem',
              }}
            >
              <div className='h-100 d-flex flex-column justify-content-between'>
                <div>
                  <h2 className='display-6 fw-bold mb-4'>{planTitle}</h2>

                  <div className='mb-4'>
                    <div className='d-flex justify-content-center mb-3'>
                      <ToggleButtonGroup
                        type='radio'
                        name='billingCycle'
                        value={billingCycle}
                        onChange={handleBillingCycleChange}
                        className='w-100'
                      >
                        <ToggleButton
                          id='monthly-option'
                          value={PaymentPeriodicity.MONTHLY}
                          variant={
                            billingCycle === PaymentPeriodicity.MONTHLY ? 'light' : 'outline-light'
                          }
                          className='w-50'
                        >
                          Mensual
                        </ToggleButton>
                        <ToggleButton
                          id='annual-option'
                          value={PaymentPeriodicity.ANNUAL}
                          variant={
                            billingCycle === PaymentPeriodicity.ANNUAL ? 'light' : 'outline-light'
                          }
                          className='w-50'
                        >
                          Anual
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </div>

                    <h3 className='display-5 fw-bold mb-2'>
                      ${priceInfo.displayPrice}
                      <small className='fs-6'>/{priceInfo.period}</small>
                    </h3>

                    {billingCycle === PaymentPeriodicity.ANNUAL && (
                      <div className='bg-white bg-opacity-25 rounded py-2 px-3 mb-3 text-center'>
                        <span className='badge bg-warning text-dark me-2'>20% DESCUENTO</span>
                        <span>Ahorras ${priceInfo.savings}</span>

                        <div className='small mt-1'>
                          Equivale a $
                          {Math.round(priceInfo.calculatedPrice / 12)
                            .toLocaleString('es-CO')
                            .replace(/,/g, '.')}
                          /mes
                        </div>
                      </div>
                    )}
                  </div>

                  {planBenefits.map((benefit, index) => (
                    <div key={index} className='d-flex align-items-center mb-3'>
                      <i className={`${benefit.icon} me-2`}></i>
                      <span>{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Col>

            <Col md={7} className='bg-white p-4'>
              <h4 className='mb-4'>Pagar con Mercado Pago</h4>
              <p className='text-muted mb-4'>
                Paga de forma segura con tarjeta de crédito, débito, PSE, efectivo o tu cuenta de Mercado Pago.
              </p>

              <div className='d-flex align-items-center mb-3'>
                <img
                  src='https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/6.6.92/mercadopago/logo__large@2x.png'
                  alt='Mercado Pago'
                  style={{ height: '32px' }}
                  className='me-3'
                  onError={(e: any) => { e.target.style.display = 'none'; }}
                />
                <div className='d-flex gap-2'>
                  <i className='fab fa-cc-visa fa-2x text-muted'></i>
                  <i className='fab fa-cc-mastercard fa-2x text-muted'></i>
                  <i className='fab fa-cc-amex fa-2x text-muted'></i>
                </div>
              </div>

              <div className='bg-light p-3 rounded mb-4'>
                <div className='d-flex justify-content-between align-items-center'>
                  <span className='fw-bold'>{planTitle} ({billingCycle === PaymentPeriodicity.ANNUAL ? 'Anual' : 'Mensual'})</span>
                  <span className='fw-bold text-primary fs-5'>
                    ${priceInfo.displayPrice} COP
                  </span>
                </div>
              </div>

              {!preferenceId ? (
                <div className='d-grid gap-2'>
                  <Button
                    size='lg'
                    className='fw-bold'
                    style={{
                      backgroundColor: '#009ee3',
                      borderColor: '#009ee3',
                      color: 'white',
                      borderRadius: '8px',
                      padding: '14px 24px',
                      fontSize: '1.1rem',
                    }}
                    onClick={handleCreatePreference}
                    disabled={loadingPreference || hasSpecialPlan()}
                  >
                    {loadingPreference ? (
                      <>
                        <Spinner
                          as='span'
                          animation='border'
                          size='sm'
                          role='status'
                          aria-hidden='true'
                          className='me-2'
                        />
                        Redirigiendo a Mercado Pago...
                      </>
                    ) : hasSpecialPlan() ? (
                      'Ya tienes este plan'
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src='https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/6.6.92/mercadopago/logo__large@2x.png'
                          alt='Mercado Pago'
                          style={{ height: '24px', marginRight: '10px', filter: 'brightness(0) invert(1)' }}
                          onError={(e: any) => { e.target.style.display = 'none'; }}
                        />
                        Pagar con Mercado Pago
                      </>
                    )}
                  </Button>
                  <p className='text-center text-muted small mt-2'>
                    <i className='fas fa-lock me-1'></i>
                    Paga de forma segura
                  </p>
                </div>
              ) : null}

              {hasSpecialPlan() && (
                <Button variant='danger' onClick={handleCancel} className='mt-3 w-100'>
                  Cancelar suscripción
                </Button>
              )}

              <div className='mt-4 text-center'>
                <small className='text-muted'>
                  <i className='fas fa-shield-alt me-1'></i>
                  Tus datos están protegidos por Mercado Pago.
                  Pago 100% seguro.
                </small>
              </div>
            </Col>
          </Row>
        )}
      </div>

      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancelación de Suscripción</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='text-center mb-4'>
            <div className='display-4 text-warning mb-3'>
              <i className='fas fa-exclamation-triangle'></i>
            </div>
          </div>
          <p className='fw-bold text-center mb-3'>Lamentamos que desees cancelar tu suscripción</p>
          <p>Al confirmar la cancelación:</p>
          <ul>
            <li>No se realizarán más cobros automáticos</li>
            {subscriptionInfo?.subscriptionExpiresAt ? (
              <li>
                Tu servicio seguirá activo hasta el{' '}
                <strong>
                  {new Date(subscriptionInfo.subscriptionExpiresAt).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </strong>
                {subscriptionInfo.daysRemaining && (
                  <span> ({subscriptionInfo.daysRemaining} días restantes)</span>
                )}
              </li>
            ) : (
              <li>Tu cuenta perderá el acceso inmediato a las funcionalidades premium</li>
            )}
            <li>Después de esa fecha, tu cuenta pasará al plan gratuito</li>
          </ul>
          <p className='mt-3'>¿Estás seguro de que deseas proceder con la cancelación?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowCancelModal(false)}>
            No, mantener mi plan
          </Button>
          <Button variant='danger' onClick={confirmCancelSubscription}>
            Sí, cancelar suscripción
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PaymentForm;
