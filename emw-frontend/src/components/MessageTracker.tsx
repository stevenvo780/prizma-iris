import React, { useState, useEffect, useCallback } from 'react';
import { Card, ProgressBar, Badge, Table, Button, Row, Col } from 'react-bootstrap';
import { FaSync, FaCheckCircle, FaTimesCircle, FaClock, FaPaperPlane } from 'react-icons/fa';
import api from '@/api';
import { MessageStatus, MessageLog } from '@utils/types';
import styles from '@styles/MessageTracker.module.css';

interface MessageTrackerProps {
  messageIds?: string[];
  customerTags?: string[];
  refreshInterval?: number;
  onClose?: () => void;
}

interface MessageStats {
  total: number;
  pending: number;
  queued: number;
  processing: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  cancelled: number;
}

const MessageTracker: React.FC<MessageTrackerProps> = ({
  messageIds = [],
  customerTags = [],
  refreshInterval = 5000,
  onClose
}) => {
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [stats, setStats] = useState<MessageStats>({
    total: 0,
    pending: 0,
    queued: 0,
    processing: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    cancelled: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMessageStatus = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await api.messages.getMessagesAPI({
        page: 1,
        limit: 100,
        dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      });

      const allMessages = Array.isArray(response.data) ? response.data : [];

      let filteredMessages: MessageLog[] = allMessages as any;
      if (messageIds.length > 0) {
        filteredMessages = allMessages.filter((msg: any) =>
          msg.id && messageIds.includes(msg.id)
        ) as any;
      }

      setMessages(filteredMessages);

      const newStats: MessageStats = {
        total: filteredMessages.length,
        pending: 0,
        queued: 0,
        processing: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        cancelled: 0,
      };

      filteredMessages.forEach((msg: MessageLog) => {
        switch (msg.status) {
          case MessageStatus.PENDING:
            newStats.pending++;
            break;
          case MessageStatus.QUEUED:
            newStats.queued++;
            break;
          case MessageStatus.PROCESSING:
            newStats.processing++;
            break;
          case MessageStatus.SENT:
            newStats.sent++;
            break;
          case MessageStatus.DELIVERED:
            newStats.delivered++;
            break;
          case MessageStatus.READ:
            newStats.read++;
            break;
          case MessageStatus.FAILED:
            newStats.failed++;
            break;
          case MessageStatus.CANCELLED:
            newStats.cancelled++;
            break;
        }
      });

      setStats(newStats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error al obtener estado de mensajes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messageIds]);

  const fetchGeneralStats = async () => {
    try {
      const statsResponse = await api.messages.getMessageStatsAPI({
        dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        dateTo: new Date().toISOString(),
      });

      if (statsResponse.data) {
        console.log('Estadísticas generales:', statsResponse.data);
      }
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    }
  };

  useEffect(() => {
    fetchMessageStatus();
    fetchGeneralStats();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMessageStatus();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchMessageStatus]);

  const getStatusBadge = (status: MessageStatus) => {
    const statusConfig = {
      [MessageStatus.PENDING]: { variant: 'secondary', icon: <FaClock /> },
      [MessageStatus.QUEUED]: { variant: 'info', icon: <FaClock /> },
      [MessageStatus.PROCESSING]: { variant: 'warning', icon: <FaPaperPlane /> },
      [MessageStatus.SENT]: { variant: 'primary', icon: <FaPaperPlane /> },
      [MessageStatus.DELIVERED]: { variant: 'success', icon: <FaCheckCircle /> },
      [MessageStatus.READ]: { variant: 'success', icon: <FaCheckCircle /> },
      [MessageStatus.FAILED]: { variant: 'danger', icon: <FaTimesCircle /> },
      [MessageStatus.RETRYING]: { variant: 'warning', icon: <FaClock /> },
      [MessageStatus.CANCELLED]: { variant: 'dark', icon: <FaTimesCircle /> },
    };

    const config = statusConfig[status] || { variant: 'secondary', icon: null };

    return (
      <Badge bg={config.variant} className="d-flex align-items-center gap-1">
        {config.icon}
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getProgressPercentage = () => {
    if (stats.total === 0) return 0;
    const completed = stats.delivered + stats.read;
    return Math.round((completed / stats.total) * 100);
  };

  const retryFailedMessage = async (messageId: string) => {
    try {
      await api.messages.retryMessageAPI(messageId);
      await fetchMessageStatus();
    } catch (error) {
      console.error('Error al reintentar mensaje:', error);
    }
  };

  const cancelPendingMessage = async (messageId: string) => {
    try {
      await api.messages.cancelMessageAPI(messageId);
      await fetchMessageStatus();
    } catch (error) {
      console.error('Error al cancelar mensaje:', error);
    }
  };

  return (
    <Card className="mb-3">
      <Card.Header>
        <Row className="align-items-center">
          <Col>
            <h5 className="mb-0">📊 Tracking de Mensajes en Tiempo Real</h5>
            <small className="text-muted">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </small>
          </Col>
          <Col xs="auto">
            <Button
              size="sm"
              variant={autoRefresh ? 'success' : 'secondary'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <FaSync className={autoRefresh ? 'fa-spin' : ''} />
              {' '}{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>
            {onClose && (
              <Button size="sm" variant="light" onClick={onClose} className="ms-2">
                ✕
              </Button>
            )}
          </Col>
        </Row>
      </Card.Header>

      <Card.Body>

        <div className="mb-4">
          <div className="d-flex justify-content-between mb-2">
            <span>Progreso de envío</span>
            <span>{getProgressPercentage()}%</span>
          </div>
          <ProgressBar>
            <ProgressBar
              variant="success"
              now={(stats.delivered + stats.read) / stats.total * 100}
              label={`${stats.delivered + stats.read} entregados`}
            />
            <ProgressBar
              variant="primary"
              now={stats.sent / stats.total * 100}
              label={`${stats.sent} enviados`}
            />
            <ProgressBar
              variant="warning"
              now={(stats.processing + stats.queued) / stats.total * 100}
              label={`${stats.processing + stats.queued} en proceso`}
            />
            <ProgressBar
              variant="danger"
              now={stats.failed / stats.total * 100}
              label={`${stats.failed} fallidos`}
            />
          </ProgressBar>
        </div>

        <Row className="mb-3 text-center">
          <Col xs={6} md={3}>
            <div className="p-2 border rounded">
              <h6>Total</h6>
              <h4>{stats.total}</h4>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="p-2 border rounded bg-success bg-opacity-10">
              <h6>Entregados</h6>
              <h4 className="text-success">{stats.delivered + stats.read}</h4>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="p-2 border rounded bg-warning bg-opacity-10">
              <h6>En Proceso</h6>
              <h4 className="text-warning">{stats.processing + stats.queued + stats.pending}</h4>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="p-2 border rounded bg-danger bg-opacity-10">
              <h6>Fallidos</h6>
              <h4 className="text-danger">{stats.failed}</h4>
            </div>
          </Col>
        </Row>

        {messages.length > 0 && (
          <div className="table-responsive">
            <Table hover size="sm">
              <thead>
                <tr>
                  <th>Destinatario</th>
                  <th>Estado</th>
                  <th>Tipo</th>
                  <th>Enviado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {messages.slice(0, 10).map((message) => (
                  <tr key={message.id}>
                    <td>{message.recipientNumber}</td>
                    <td>{getStatusBadge(message.status)}</td>
                    <td>{message.type}</td>
                    <td>
                      {message.sentAt
                        ? new Date(message.sentAt).toLocaleString()
                        : 'Pendiente'}
                    </td>
                    <td>
                      {message.status === MessageStatus.FAILED && (
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => retryFailedMessage(message.id)}
                        >
                          Reintentar
                        </Button>
                      )}
                      {(message.status === MessageStatus.PENDING ||
                        message.status === MessageStatus.QUEUED) && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => cancelPendingMessage(message.id)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {messages.length > 10 && (
              <div className="text-center text-muted">
                <small>Mostrando 10 de {messages.length} mensajes</small>
              </div>
            )}
          </div>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="text-center text-muted py-4">
            <p>No hay mensajes para mostrar</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default MessageTracker;
