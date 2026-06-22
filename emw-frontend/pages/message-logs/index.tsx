import React, { useState, useEffect, FC, useCallback } from 'react';
import { Container, Row, Col, Table, Badge, Form, Button } from 'react-bootstrap';
import { withAuthSync } from '@utils/auth';
import { getMessageLogsAPI } from '@/api/messages';
import useUI from '@store/ui';
import { FaArrowUp, FaArrowDown, FaSearch, FaSync, FaClipboardList } from 'react-icons/fa';

interface CustomerTagInfo {
  name: string;
  color: string;
}

interface CustomerInfo {
  name: string;
  tags: CustomerTagInfo[];
}

interface MessageLog {
  id: string;
  recipientNumber: string;
  status: string;
  type: string;
  direction: string;
  content: string;
  whatsappMessageId: string;
  errorDetails: any;
  sentAt: string;
  deliveredAt: string;
  readAt: string;
  createdAt: string;
}

const statusLabels: Record<string, { label: string; variant: string }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  queued: { label: 'En cola', variant: 'info' },
  processing: { label: 'Procesando', variant: 'primary' },
  sent: { label: 'Enviado', variant: 'primary' },
  delivered: { label: 'Entregado', variant: 'success' },
  read: { label: 'Leído', variant: 'success' },
  failed: { label: 'Fallido', variant: 'danger' },
  retrying: { label: 'Reintentando', variant: 'warning' },
  cancelled: { label: 'Cancelado', variant: 'dark' },
  received: { label: 'Recibido', variant: 'info' },
};

const directionLabels: Record<string, { label: string; icon: any }> = {
  outbound: { label: 'Enviado', icon: <FaArrowUp style={{ color: '#3498db' }} /> },
  inbound: { label: 'Recibido', icon: <FaArrowDown style={{ color: '#27ae60' }} /> },
};

const MessageLogs: FC = () => {
  const { setLoading, addAlert } = useUI();
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, CustomerInfo>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20);

  // Filtros - por defecto ultimas 24h
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [dateFrom, setDateFrom] = useState(yesterday.toISOString().slice(0, 16));
  const [dateTo, setDateTo] = useState(now.toISOString().slice(0, 16));
  const [statusFilter, setStatusFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');

  const fetchLogs = useCallback(async (pageNum?: number) => {
    try {
      setLoading(true);
      const params: any = {
        page: pageNum || page,
        limit,
      };
      if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString();
      if (dateTo) params.dateTo = new Date(dateTo).toISOString();
      if (statusFilter) params.status = statusFilter;
      if (directionFilter) params.direction = directionFilter;
      if (phoneFilter) params.recipientNumber = phoneFilter;

      const response = await getMessageLogsAPI(params);
      setLogs(response.data.logs);
      setCustomerMap(response.data.customerMap || {});
      setTotal(response.data.total);
      setPage(response.data.page);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error('Error al obtener historial:', err);
      addAlert({ type: 'danger', message: 'Error al cargar el historial de mensajes' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, dateFrom, dateTo, statusFilter, directionFilter, phoneFilter, setLoading, addAlert]);

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchLogs(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchLogs(newPage);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const truncate = (str: string, max: number) => {
    if (!str) return '—';
    return str.length > max ? str.substring(0, max) + '...' : str;
  };

  const paginationBtnStyle = (active = false, disabled = false): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    height: 36,
    padding: '0 10px',
    margin: '0 3px',
    borderRadius: '10px',
    border: active ? 'none' : '1px solid #e0e4e8',
    background: active ? '#2c3e50' : disabled ? '#f9fafb' : '#fff',
    color: active ? '#fff' : disabled ? '#c0c5cc' : '#2c3e50',
    fontSize: '0.82rem',
    fontWeight: active ? 700 : 500,
    cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: active ? '0 2px 8px rgba(44,62,80,0.18)' : 'none',
    userSelect: 'none' as const,
  });

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages: React.ReactNode[] = [];

    if (start > 1) {
      pages.push(
        <span key="start-ellipsis" style={{ ...paginationBtnStyle(false, true), border: 'none', background: 'transparent' }}>…</span>
      );
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <span
          key={i}
          style={paginationBtnStyle(i === page)}
          onClick={() => i !== page && handlePageChange(i)}
          onMouseEnter={(e) => { if (i !== page) (e.currentTarget.style.background = '#eef1f5'); }}
          onMouseLeave={(e) => { if (i !== page) (e.currentTarget.style.background = '#fff'); }}
        >
          {i}
        </span>,
      );
    }

    if (end < totalPages) {
      pages.push(
        <span key="end-ellipsis" style={{ ...paginationBtnStyle(false, true), border: 'none', background: 'transparent' }}>…</span>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 20 }}>
        <span
          style={paginationBtnStyle(false, page === 1)}
          onClick={() => page > 1 && handlePageChange(1)}
          title="Primera"
        >«</span>
        <span
          style={paginationBtnStyle(false, page === 1)}
          onClick={() => page > 1 && handlePageChange(page - 1)}
          title="Anterior"
        >‹</span>

        {pages}

        <span
          style={paginationBtnStyle(false, page === totalPages)}
          onClick={() => page < totalPages && handlePageChange(page + 1)}
          title="Siguiente"
        >›</span>
        <span
          style={paginationBtnStyle(false, page === totalPages)}
          onClick={() => page < totalPages && handlePageChange(totalPages)}
          title="Última"
        >»</span>

        <span style={{ marginLeft: 12, fontSize: '0.78rem', color: '#7f8c8d' }}>
          Página {page} de {totalPages}
        </span>
      </div>
    );
  };

  return (
    <div style={{ background: '#f5f6fa', minHeight: '100vh', paddingTop: '24px', paddingBottom: '40px' }}>
    <Container fluid style={{ padding: '0 40px' }}>
      <Row className="mb-4">
        <Col>
          <h2 style={{ fontWeight: 700, color: '#2c3e50', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaClipboardList style={{ color: '#3498db' }} /> Historial de Mensajes
          </h2>
          <small className="text-muted">
            Consulta los mensajes enviados y recibidos. Total: <strong>{total}</strong> registros.
          </small>
        </Col>
      </Row>

      {/* Filtros */}
      <Row className="mb-4 g-2 align-items-end" style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e0e4e8',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <Col xs={12} md={2}>
          <Form.Label className="mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Desde</Form.Label>
          <Form.Control
            type="datetime-local"
            size="sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </Col>
        <Col xs={12} md={2}>
          <Form.Label className="mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Hasta</Form.Label>
          <Form.Control
            type="datetime-local"
            size="sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </Col>
        <Col xs={6} md={2}>
          <Form.Label className="mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Estado</Form.Label>
          <Form.Select
            size="sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="sent">Enviado</option>
            <option value="delivered">Entregado</option>
            <option value="read">Leído</option>
            <option value="failed">Fallido</option>
            <option value="pending">Pendiente</option>
            <option value="queued">En cola</option>
            <option value="cancelled">Cancelado</option>
          </Form.Select>
        </Col>
        <Col xs={6} md={2}>
          <Form.Label className="mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Dirección</Form.Label>
          <Form.Select
            size="sm"
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="outbound">Enviados</option>
            <option value="inbound">Recibidos</option>
          </Form.Select>
        </Col>
        <Col xs={8} md={2}>
          <Form.Label className="mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Teléfono</Form.Label>
          <Form.Control
            type="text"
            size="sm"
            placeholder="Ej: 573046..."
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
          />
        </Col>
        <Col xs={4} md={2} className="d-flex gap-2">
          <Button variant="primary" size="sm" onClick={handleSearch} style={{ borderRadius: '20px', padding: '6px 16px' }}>
            <FaSearch style={{ marginRight: 4 }} /> Buscar
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={() => fetchLogs(page)} style={{ borderRadius: '20px', padding: '6px 12px' }}>
            <FaSync />
          </Button>
        </Col>
      </Row>

      {/* Tabla */}
      <Row>
        <Col>
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e9ecef' }}>
            <Table hover responsive style={{ marginBottom: 0, fontSize: '0.85rem' }}>
              <thead style={{ background: '#2c3e50', color: 'white' }}>
                <tr>
                  <th style={{ padding: '12px 16px' }}>Fecha</th>
                  <th style={{ padding: '12px 16px' }}>Dir.</th>
                  <th style={{ padding: '12px 16px' }}>Teléfono</th>
                  <th style={{ padding: '12px 16px' }}>Cliente / Etiquetas</th>
                  <th style={{ padding: '12px 16px' }}>Tipo</th>
                  <th style={{ padding: '12px 16px' }}>Contenido</th>
                  <th style={{ padding: '12px 16px' }}>Estado</th>
                  <th style={{ padding: '12px 16px' }}>Entregado</th>
                  <th style={{ padding: '12px 16px' }}>Leído</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center" style={{ padding: '40px', color: '#999' }}>
                      No se encontraron registros para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const statusInfo = statusLabels[log.status] || { label: log.status, variant: 'secondary' };
                    const dirInfo = directionLabels[log.direction] || { label: log.direction, icon: null };
                    return (
                      <tr key={log.id} style={{ verticalAlign: 'middle' }}>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                          {formatDate(log.createdAt)}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <span title={dirInfo.label}>{dirInfo.icon}</span>
                        </td>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {log.recipientNumber || '—'}
                        </td>
                        <td style={{ padding: '10px 16px', maxWidth: '200px' }}>
                          {(() => {
                            const phone = log.recipientNumber?.replace(/^\+/, '') || '';
                            const info = customerMap[phone] || customerMap[`+${phone}`];
                            if (!info) return <span style={{ color: '#999', fontSize: '0.8rem' }}>—</span>;
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#2c3e50' }}>
                                  {info.name}
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                  {info.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        display: 'inline-block',
                                        background: tag.color,
                                        color: '#fff',
                                        fontSize: '0.65rem',
                                        padding: '1px 6px',
                                        borderRadius: '8px',
                                        fontWeight: 500,
                                        lineHeight: '1.4',
                                      }}
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <Badge bg="light" text="dark" style={{ fontWeight: 500 }}>
                            {log.type}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 16px', maxWidth: '300px' }}>
                          <span title={log.content}>{truncate(log.content, 60)}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <Badge bg={statusInfo.variant} style={{ fontSize: '0.75rem' }}>
                            {statusInfo.label}
                          </Badge>
                          {log.errorDetails && (
                            <span title={JSON.stringify(log.errorDetails)} style={{ cursor: 'help', marginLeft: 4 }}>
                              ⚠️
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {formatDate(log.deliveredAt)}
                        </td>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {formatDate(log.readAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>

      {renderPagination()}
    </Container>
    </div>
  );
};

export async function getStaticProps() {
  return { props: {}, revalidate: 1 };
}

export default withAuthSync(MessageLogs);
