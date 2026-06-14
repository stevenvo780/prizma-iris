import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * API Real para Notificaciones WhatsApp - CRÍTICO FLUJO 1A
 *
 * Este módulo implementa los endpoints reales requeridos por Hub Central
 * para completar el Flujo 1A con notificaciones WhatsApp automáticas.
 */

export const NotificationAPIRoutes = [
  {
    method: 'POST',
    path: '/api/notifications',
    description: 'Crear notificación WhatsApp desde Hub Central - ENDPOINT CRÍTICO FLUJO 1A',
    handler: 'notificationController.createNotification',
    auth: false,
    validation: {
      headers: {
        'x-hub-signature': 'required',
        'content-type': 'application/json',
      },
      payload: {
        orderId: 'string.required',
        orderNumber: 'string.required',
        customerName: 'string.required',
        customerPhone: 'string.required',
        notificationType:
          'string.required.valid(order_created,order_paid,order_shipped,order_delivered,delivery_created,delivery_assigned)',
        orderValue: 'number.required',
        timestamp: 'string.required',
      },
    },
  },
  {
    method: 'POST',
    path: '/api/templates/send',
    description: 'Enviar template WhatsApp personalizado',
    handler: 'notificationController.sendTemplate',
    auth: false,
    validation: {
      headers: {
        'x-hub-signature': 'required',
        'content-type': 'application/json',
      },
      payload: {
        customerId: 'string.required',
        templateType: 'string.required',
        variables: 'object.required',
      },
    },
  },
  {
    method: 'GET',
    path: '/api/notifications/{notificationId}/status',
    description: 'Consultar estado de notificación enviada',
    handler: 'notificationController.getNotificationStatus',
    auth: false,
  },
  {
    method: 'GET',
    path: '/api/notifications/health',
    description: 'Health check del servicio de notificaciones',
    handler: 'notificationController.healthCheck',
    auth: false,
  },
];

@Module({
  imports: [

  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class NotificationAPIModule {}
