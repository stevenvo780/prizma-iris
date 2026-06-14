import React from 'react';
import { Alert, ProgressBar, Badge } from 'react-bootstrap';
import { FaCheckCircle, FaExclamationTriangle, FaClock, FaUsers } from 'react-icons/fa';

interface BulkSendStatusProps {
  isLoading: boolean;
  stats?: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
  lastSendResult?: {
    processed: number;
    failed: number;
    total: number;
  };
}

const BulkSendStatus: React.FC<BulkSendStatusProps> = ({ isLoading, stats, lastSendResult }) => {
  if (isLoading) {
    return (
      <Alert variant="info" className="mt-3">
        <div className="d-flex align-items-center">
          <div className="spinner-border spinner-border-sm me-2" role="status">
            <span className="visually-hidden">Enviando...</span>
          </div>
          <span>Enviando mensajes masivos...</span>
        </div>
        <ProgressBar animated now={100} className="mt-2" />
      </Alert>
    );
  }

  if (lastSendResult) {
    const successRate = lastSendResult.total > 0
      ? Math.round((lastSendResult.processed / lastSendResult.total) * 100)
      : 0;

    return (
      <Alert variant={successRate > 50 ? 'success' : 'warning'} className="mt-3">
        <h6>Resultado del último envío masivo:</h6>
        <div className="d-flex justify-content-between mt-2">
          <div>
            <FaUsers className="me-2" />
            <Badge bg="secondary">{lastSendResult.total} clientes</Badge>
          </div>
          <div>
            <FaCheckCircle className="me-2 text-success" />
            <Badge bg="success">{lastSendResult.processed} enviados</Badge>
          </div>
          <div>
            <FaExclamationTriangle className="me-2 text-warning" />
            <Badge bg="warning">{lastSendResult.failed} fallidos</Badge>
          </div>
        </div>
        <ProgressBar className="mt-2">
          <ProgressBar
            variant="success"
            now={(lastSendResult.processed / lastSendResult.total) * 100}
            label={`${lastSendResult.processed}`}
          />
          <ProgressBar
            variant="warning"
            now={(lastSendResult.failed / lastSendResult.total) * 100}
            label={`${lastSendResult.failed}`}
          />
        </ProgressBar>
        {lastSendResult.failed > 0 && (
          <small className="text-muted d-block mt-2">
            Los mensajes fallidos pueden deberse a clientes sin opt-in activo
          </small>
        )}
      </Alert>
    );
  }

  if (stats) {
    return (
      <Alert variant="light" className="mt-3">
        <h6>Estado de clientes:</h6>
        <div className="d-flex justify-content-between mt-2">
          <div>
            <FaUsers className="me-2" />
            <Badge bg="primary">{stats.total} total</Badge>
          </div>
          <div>
            <FaCheckCircle className="me-2 text-success" />
            <Badge bg="success">{stats.sent} con opt-in</Badge>
          </div>
          <div>
            <FaClock className="me-2 text-warning" />
            <Badge bg="warning">{stats.pending} pendientes</Badge>
          </div>
        </div>
      </Alert>
    );
  }

  return null;
};

export default BulkSendStatus;
