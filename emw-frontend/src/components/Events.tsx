import React from 'react';
import { Alert } from 'react-bootstrap';
import RingLoader from 'react-spinners/RingLoader';
import useUI from '@store/ui';
import styles from '@styles/AlertComponent.module.css';

const Events: React.FC = () => {
  const { alerts, loading, removeAlert } = useUI();

  const handleClose = (index: number) => {
    removeAlert(index);
  };

  const loaderOverride: any = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 9999,
  };

  return (
    <>
      {loading && (
        <RingLoader
          color={'#0066CC'}
          loading={loading}
          cssOverride={loaderOverride}
          size={100}
          aria-label='Cargando'
          data-testid='loader'
        />
      )}
      <div className={styles.alertContainer}>
        {alerts.map((alert, index) => (
          <Alert
            key={index}
            variant={alert.type}
            onClose={() => handleClose(index)}
            dismissible
            className={styles.alert}
          >
            {alert.message}
          </Alert>
        ))}
      </div>
    </>
  );
};

export default Events;
