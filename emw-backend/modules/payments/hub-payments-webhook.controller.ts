import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { verifySignature } from 'prizma-contracts';
import { PaymentsService } from './payments.service';

/**
 * HubPaymentsWebhookController
 *
 * Recibe los eventos de pago que el Hub (Nous) entrega a Iris tras procesar
 * un webhook de Mercado Pago. Implementa el contrato de receptor documentado
 * en PAYMENTS_MIGRATION.md §Apéndice A.
 *
 * Endpoint: POST /api/webhooks/payments
 * Headers:
 *   x-prizma-event       — eventType (ej. "pago.aprobado")
 *   x-prizma-target      — producto destino (debe ser "iris")
 *   x-prizma-signature   — HMAC-SHA256 del body con NOUS_HUB_SECRET
 *   x-idempotency-key    — clave de idempotencia (ej. "mp:<mpId>:<eventType>")
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class HubPaymentsWebhookController {
  private readonly logger = new Logger(HubPaymentsWebhookController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('payments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receptor de eventos pago.* entregados por el Hub (Nous)' })
  @ApiResponse({ status: 200, description: 'Evento procesado' })
  @ApiResponse({ status: 401, description: 'Firma inválida' })
  async handleHubPayment(
    @Body() body: Record<string, any>,
    @Headers('x-prizma-event') eventType: string,
    @Headers('x-prizma-signature') signature: string,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    // Validar firma del Hub con NOUS_HUB_SECRET
    const hubSecret = this.configService.get<string>('NOUS_HUB_SECRET');

    if (hubSecret) {
      const valid = verifySignature(body, signature, hubSecret);
      if (!valid) {
        this.logger.warn(
          `Hub payment webhook: firma inválida para evento "${eventType}" (idempotencyKey=${idempotencyKey})`,
        );
        throw new UnauthorizedException('Invalid hub signature');
      }
    } else {
      // Sin secreto configurado: logueamos advertencia pero no bloqueamos
      // (permite despliegues iniciales sin secreto; el secreto se añade luego)
      this.logger.warn(
        'NOUS_HUB_SECRET no configurado — validación de firma del Hub omitida',
      );
    }

    const resolvedEventType = eventType ?? body?.eventType;
    const payload: Record<string, any> = body?.data ?? body;

    this.logger.log(
      `Hub payment event recibido: ${resolvedEventType} (idempotencyKey=${idempotencyKey})`,
    );

    await this.paymentsService.handleHubPaymentEvent(resolvedEventType, payload);

    return { ok: true, event: resolvedEventType };
  }
}
