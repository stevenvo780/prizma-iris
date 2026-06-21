import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Logger,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { MessagesService, SendMessageDto } from '../messages/messages.service';
import { MessageType } from '../messages/entities/message-log.entity';
import { QueueService } from '../queue/queue.service';

/**
 * NotificationController — implementación real para los endpoints de
 * NotificationAPI que consume Nous (Flow 1A: notificaciones WhatsApp).
 *
 * Los handlers encolan mensajes reales vía MessagesService. Requiere:
 *   NOUS_SERVICE_USER_ID — userId del usuario de servicio del conector Nous
 *     (debe existir en DB con cuenta WhatsApp activa).
 */
@ApiTags('notifications')
@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Resuelve el userId de servicio para el conector Nous.
   * Lanza ServiceUnavailableException si no está configurado.
   */
  private resolveServiceUserId(): string {
    const userId = process.env.NOUS_SERVICE_USER_ID;
    if (!userId) {
      throw new ServiceUnavailableException(
        'NOUS_SERVICE_USER_ID no configurado — el conector Nous no puede encolar mensajes. ' +
        'Configura el env con el userId del usuario de servicio de Iris.',
      );
    }
    return userId;
  }

  /**
   * Genera el texto del mensaje de notificación a partir del payload de Nous.
   * Mapea los tipos de notificación a mensajes legibles en español.
   */
  private buildNotificationText(payload: Record<string, unknown>): string {
    const {
      customerName,
      orderId,
      orderNumber,
      notificationType,
      orderValue,
    } = payload;

    const nombre = (customerName as string) || 'Cliente';
    const numero = (orderNumber as string) || (orderId as string) || 'N/A';
    const valor = orderValue != null ? ` por $${orderValue}` : '';

    switch (notificationType) {
      case 'order_created':
        return `Hola ${nombre}, tu pedido #${numero}${valor} fue recibido y está siendo procesado.`;
      case 'order_paid':
        return `Hola ${nombre}, recibimos el pago de tu pedido #${numero}${valor}. ¡Gracias!`;
      case 'order_shipped':
        return `Hola ${nombre}, tu pedido #${numero} ha sido enviado y está en camino.`;
      case 'order_delivered':
        return `Hola ${nombre}, tu pedido #${numero} fue entregado. ¡Esperamos que lo disfrutes!`;
      case 'delivery_created':
        return `Hola ${nombre}, se creó una entrega para tu pedido #${numero}. Pronto recibirás más detalles.`;
      case 'delivery_assigned':
        return `Hola ${nombre}, tu pedido #${numero} fue asignado a un repartidor y está en camino.`;
      default:
        return `Hola ${nombre}, tienes una actualización sobre tu pedido #${numero}.`;
    }
  }

  /**
   * POST /api/notifications
   * Recibe una solicitud de notificación WhatsApp desde Nous y la encola.
   */
  @Post('notifications')
  @ApiOperation({ summary: 'Crear y encolar notificación WhatsApp (conector Nous)' })
  @ApiCreatedResponse({ description: 'Notificación encolada en MessagesService' })
  async createNotification(@Body() payload: Record<string, unknown>) {
    const userId = this.resolveServiceUserId();

    this.logger.log(
      `[nous] notification/create: orderId=${payload.orderId} type=${payload.notificationType} phone=${payload.customerPhone}`,
    );

    const customerPhone = payload.customerPhone as string;
    if (!customerPhone) {
      throw new InternalServerErrorException('Payload inválido: falta customerPhone');
    }

    const messageText = this.buildNotificationText(payload);

    const sendDto: SendMessageDto = {
      recipientNumber: customerPhone,
      content: messageText,
      type: MessageType.TEXT,
      priority: 1,
    };

    const logs = await this.messagesService.sendMessage(sendDto, userId);
    const firstLog = logs[0];

    this.logger.log(
      `[nous] notification encolada: messageLogId=${firstLog?.id} orderId=${payload.orderId}`,
    );

    return {
      success: true,
      message: 'Notificación encolada',
      messageLogId: firstLog?.id,
      status: firstLog?.status,
      orderId: payload.orderId || 'unknown',
      notificationType: payload.notificationType || 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/notifications/whatsapp
   * Alias directo para envío WhatsApp desde Nous.
   */
  @Post('notifications/whatsapp')
  @ApiOperation({ summary: 'Enviar notificación WhatsApp directa (conector Nous)' })
  @ApiCreatedResponse({ description: 'WhatsApp encolado en MessagesService' })
  async createWhatsAppNotification(@Body() payload: Record<string, unknown>) {
    const userId = this.resolveServiceUserId();

    this.logger.log(
      `[nous] notification/whatsapp: orderId=${payload.orderId} to=${payload.customerPhone}`,
    );

    const customerPhone = payload.customerPhone as string;
    if (!customerPhone) {
      throw new InternalServerErrorException('Payload inválido: falta customerPhone');
    }

    const messageText = this.buildNotificationText(payload);

    const sendDto: SendMessageDto = {
      recipientNumber: customerPhone,
      content: messageText,
      type: MessageType.TEXT,
      priority: 1,
    };

    const logs = await this.messagesService.sendMessage(sendDto, userId);
    const firstLog = logs[0];

    this.logger.log(
      `[nous] whatsapp encolado: messageLogId=${firstLog?.id} orderId=${payload.orderId}`,
    );

    return {
      success: true,
      message: 'Notificación WhatsApp encolada',
      messageLogId: firstLog?.id,
      status: firstLog?.status,
      orderId: payload.orderId || 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/templates/send
   * Enviar template WhatsApp personalizado.
   * Espera templateId (UUID del template en Iris DB) o templateType (nombre).
   */
  @Post('templates/send')
  @ApiOperation({ summary: 'Enviar template WhatsApp (conector Nous)' })
  @ApiCreatedResponse({ description: 'Template encolado en MessagesService' })
  async sendTemplate(@Body() payload: Record<string, unknown>) {
    const userId = this.resolveServiceUserId();

    this.logger.log(
      `[nous] template/send: customerId=${payload.customerId} template=${payload.templateType} phone=${payload.customerPhone}`,
    );

    const customerPhone = payload.customerPhone as string;
    if (!customerPhone) {
      throw new InternalServerErrorException(
        'Payload inválido: falta customerPhone (requerido para templates)',
      );
    }

    // Si viene templateId (UUID de Iris DB) lo usamos directamente
    // Si solo viene templateType (nombre), enviamos texto descriptivo como fallback
    const templateId = payload.templateId as string | undefined;
    const templateParams = Array.isArray(payload.variables)
      ? (payload.variables as string[])
      : payload.variables
        ? Object.values(payload.variables as object).map(String)
        : [];

    const sendDto: SendMessageDto = templateId
      ? {
          recipientNumber: customerPhone,
          type: MessageType.TEMPLATE,
          templateId,
          templateParams,
          priority: 1,
        }
      : {
          // Fallback: no hay templateId → texto descriptivo
          recipientNumber: customerPhone,
          content: `Mensaje automatizado: ${payload.templateType || 'notificacion'} para cliente ${payload.customerId || ''}`,
          type: MessageType.TEXT,
          priority: 1,
        };

    const logs = await this.messagesService.sendMessage(sendDto, userId);
    const firstLog = logs[0];

    this.logger.log(
      `[nous] template encolado: messageLogId=${firstLog?.id} templateType=${payload.templateType}`,
    );

    return {
      success: true,
      message: 'Template encolado para envío',
      messageLogId: firstLog?.id,
      status: firstLog?.status,
      templateType: payload.templateType || 'unknown',
      customerId: payload.customerId || 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/notifications/:notificationId/status
   * Consulta estado real del job en QueueService.
   * notificationId puede ser un jobId (job_*) o un messageLogId.
   */
  @Get('notifications/:notificationId/status')
  @ApiOperation({ summary: 'Consultar estado de notificación' })
  @ApiOkResponse({ description: 'Estado de la notificación' })
  async getNotificationStatus(@Param('notificationId') notificationId: string) {
    this.logger.log(`[nous] notification/status: id=${notificationId}`);

    // Si tiene prefijo job_ intentamos buscar en QueueService
    if (notificationId.startsWith('job_')) {
      const job = await this.queueService.getJob(notificationId);
      if (job) {
        return {
          success: true,
          notificationId,
          status: job.status,
          jobType: job.type,
          attempts: job.attempts,
          createdAt: job.createdAt,
          completedAt: job.completedAt ?? null,
          error: job.error ?? null,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Si es un messageLogId o no encontramos el job → estado desconocido honesto
    return {
      success: true,
      notificationId,
      status: 'unknown',
      message: 'ID no encontrado en la cola activa (puede haber expirado o ser un messageLogId)',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/notifications/health
   * Health check del servicio de notificaciones.
   */
  @Get('notifications/health')
  @ApiOperation({ summary: 'Health check del servicio de notificaciones' })
  healthCheck() {
    const serviceUserConfigured = !!process.env.NOUS_SERVICE_USER_ID;
    return {
      status: serviceUserConfigured ? 'healthy' : 'degraded',
      service: 'Iris NotificationAPI',
      version: '2.0.0',
      serviceUserConfigured,
      warning: serviceUserConfigured
        ? undefined
        : 'NOUS_SERVICE_USER_ID no configurado — las notificaciones de Nous fallarán con 503',
      timestamp: new Date().toISOString(),
      endpoints: {
        createNotification: 'POST /api/notifications',
        createWhatsApp: 'POST /api/notifications/whatsapp',
        sendTemplate: 'POST /api/templates/send',
        getStatus: 'GET /api/notifications/:id/status',
        health: 'GET /api/notifications/health',
      },
    };
  }
}
