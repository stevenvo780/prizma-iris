import React from 'react';
import { Button, ButtonGroup, Badge, Card, Alert } from 'react-bootstrap';
import { FaPaperPlane, FaCheckCircle, FaTimes, FaClock, FaEdit, FaInfoCircle, FaBan, FaExclamationTriangle } from 'react-icons/fa';
import { Templates } from '@utils/types';
import api from '@/api';
import useUI from '@/store/ui';

interface TemplateWorkflowProps {
  template: Templates;
  onStatusChange: () => void;
}

const TemplateWorkflow: React.FC<TemplateWorkflowProps> = ({ template, onStatusChange }) => {
  const { setLoading, addAlert } = useUI();

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: string; icon: JSX.Element; label: string }> = {
      draft: { variant: 'secondary', icon: <FaEdit />, label: 'Borrador' },
      pending: { variant: 'warning', icon: <FaClock />, label: 'Pendiente de Meta' },
      approved: { variant: 'success', icon: <FaCheckCircle />, label: 'Aprobado por Meta' },
      rejected: { variant: 'danger', icon: <FaTimes />, label: 'Rechazado por Meta' },
      disabled: { variant: 'dark', icon: <FaBan />, label: 'Desactivado' },
      paused: { variant: 'info', icon: <FaClock />, label: 'Pausado por Meta' },
      flagged: { variant: 'warning', icon: <FaExclamationTriangle />, label: 'Marcado por Meta' },
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.draft;

    return (
      <Badge bg={config.variant} className="d-flex align-items-center gap-1">
        {config.icon}
        <span>{config.label}</span>
      </Badge>
    );
  };

  const handleSubmitForApproval = async () => {
    try {
      setLoading(true);
      await api.templates.submitTemplateForApprovalAPI(template.id!);
      addAlert({
        type: 'success',
        message: 'Template enviado a Meta/Facebook para aprobación. Recibirás la respuesta por webhook.'
      });
      onStatusChange();
    } catch (error: any) {
      console.error('Error al enviar template a Meta:', error);
      addAlert({
        type: 'danger',
        message: error.response?.data?.message || 'Error al enviar template a Meta para aprobación'
      });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = template.status === 'draft';
  const isPending = template.status === 'pending';
  const isApproved = template.status === 'approved';
  const isRejected = template.status === 'rejected';

  return (
    <Card className="mb-3">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Estado del Template</h6>
          {getStatusBadge(template.status)}
        </div>

        {/* Timeline visual */}
        <div className="workflow-timeline mb-3">
          <div className="d-flex justify-content-between text-center">
            <div className={`flex-fill ${template.status === 'draft' ? 'text-primary fw-bold' : ''}`}>
              <FaEdit size={20} />
              <div>Borrador</div>
            </div>
            <div className="flex-fill">→</div>
            <div className={`flex-fill ${template.status === 'pending' ? 'text-warning fw-bold' : ''}`}>
              <FaClock size={20} />
              <div>En revisión (Meta)</div>
            </div>
            <div className="flex-fill">→</div>
            <div className={`flex-fill ${template.status === 'approved' ? 'text-success fw-bold' : ''}`}>
              <FaCheckCircle size={20} />
              <div>Aprobado</div>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        {template.submittedAt && (
          <div className="text-muted small mb-2">
            Enviado a Meta: {new Date(template.submittedAt).toLocaleString()}
          </div>
        )}
        {template.approvedAt && (
          <div className="text-muted small mb-2">
            Aprobado por Meta: {new Date(template.approvedAt).toLocaleString()}
          </div>
        )}

        {/* Rejection info from Meta */}
        {isRejected && template.rejectionReason && (
          <Alert variant="danger" className="small">
            <strong>Rechazado por Meta:</strong>{' '}
            {typeof template.rejectionReason === 'string'
              ? template.rejectionReason
              : template.rejectionReason.message || JSON.stringify(template.rejectionReason)}
            {typeof template.rejectionReason === 'object' && template.rejectionReason.details && (
              <div className="mt-1">
                <strong>Detalles:</strong> {template.rejectionReason.details}
              </div>
            )}
          </Alert>
        )}

        {/* Info text for pending */}
        {isPending && (
          <Alert variant="info" className="small d-flex align-items-start gap-2">
            <FaInfoCircle className="mt-1 flex-shrink-0" />
            <div>
              Tu template está siendo revisado por Meta/Facebook. La aprobación o rechazo
              llegará automáticamente vía webhook. Este proceso puede tomar desde segundos
              hasta 24 horas.
            </div>
          </Alert>
        )}

        {/* Action buttons */}
        <ButtonGroup className="w-100">
          {canSubmit && (
            <Button
              variant="primary"
              onClick={handleSubmitForApproval}
              title="Enviar template a Meta/Facebook para aprobación"
            >
              <FaPaperPlane className="me-2" />
              Enviar a Meta para Aprobación
            </Button>
          )}

          {isPending && (
            <Button variant="warning" disabled>
              <FaClock className="me-2" />
              Esperando respuesta de Meta...
            </Button>
          )}

          {isApproved && (
            <Button variant="success" disabled>
              <FaCheckCircle className="me-2" />
              Template Aprobado ✓
            </Button>
          )}

          {isRejected && (
            <Button
              variant="warning"
              onClick={handleSubmitForApproval}
              title="Reenviar template corregido a Meta para aprobación"
            >
              <FaPaperPlane className="me-2" />
              Reenviar a Meta para Aprobación
            </Button>
          )}
        </ButtonGroup>
      </Card.Body>
    </Card>
  );
};

export default TemplateWorkflow;
