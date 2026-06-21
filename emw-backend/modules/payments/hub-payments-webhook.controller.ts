import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { verifySignature } from 'prizma-contracts';
import { PaymentsService } from './payments.service';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { WebhookLockService } from './webhook-lock.service';

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
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyKeyRepository: Repository<IdempotencyKey>,
    private readonly webhookLock: WebhookLockService,
  ) {}

  /**
   * Devuelve la respuesta cacheada si existe una entrada válida (no expirada y
   * no es un "claim" en curso, statusCode > 0). null en caso contrario.
   */
  private async lookupCached(
    idempotencyKey: string,
  ): Promise<Record<string, any> | null> {
    const cached = await this.idempotencyKeyRepository.findOne({
      where: { idempotencyKey },
    });
    if (!cached) return null;
    // statusCode === 0 → es un "claim" en curso de otro proceso, no una
    // respuesta final: NO se devuelve como cache.
    if (cached.statusCode === 0) return null;
    if (cached.expiresAt > new Date()) {
      return cached.cachedResponse;
    }
    return null;
  }

  @Post('payments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receptor de eventos pago.* entregados por el Hub (Nous)' })
  @ApiResponse({ status: 200, description: 'Evento procesado o cached (idempotencia)' })
  @ApiResponse({ status: 401, description: 'Firma inválida' })
  async handleHubPayment(
    @Body() body: Record<string, any>,
    @Headers('x-prizma-event') eventType: string,
    @Headers('x-prizma-signature') signature: string,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    // Validar firma del Hub con NOUS_HUB_SECRET.
    // FAIL-CLOSED: sin secreto NO se procesa nada en producción. Este webhook
    // acredita PREMIUM, así que aceptar sin firma es escalada de privilegios.
    const hubSecret = this.configService.get<string>('NOUS_HUB_SECRET');
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    if (!hubSecret) {
      if (isProduction) {
        this.logger.error(
          'NOUS_HUB_SECRET no configurado en producción — rechazando webhook de pagos (fail-closed)',
        );
        throw new UnauthorizedException('Hub signature secret not configured');
      }
      // Solo fuera de producción se permite el bypass, y se loguea como error.
      this.logger.error(
        '⚠️ NOUS_HUB_SECRET no configurado — bypass de firma permitido SOLO porque NODE_ENV !== "production"',
      );
    } else {
      const valid = verifySignature(body, signature, hubSecret);
      if (!valid) {
        this.logger.warn(
          `Hub payment webhook: firma inválida para evento "${eventType}" (idempotencyKey=${idempotencyKey})`,
        );
        throw new UnauthorizedException('Invalid hub signature');
      }
    }

    const resolvedEventType = eventType ?? body?.eventType;
    const payload: Record<string, any> = body?.data ?? body;
    const response = { ok: true, event: resolvedEventType };

    // ── Sin idempotencyKey: no podemos lockear ni cachear. Procesamos confiando
    //    en la verificación de estado de PaymentsService (Payment.status), que
    //    sigue siendo la red de seguridad contra doble crédito.
    if (!idempotencyKey) {
      this.logger.warn(
        `Hub payment event SIN x-idempotency-key (${resolvedEventType}); sin lock, ` +
          `confiando en el guard de Payment.status.`,
      );
      await this.paymentsService.handleHubPaymentEvent(
        resolvedEventType,
        payload,
      );
      return response;
    }

    // CIERRE IDEMPOTENCIA — PASO 0: cache hit antes de gastar un lock.
    const cachedBefore = await this.lookupCached(idempotencyKey);
    if (cachedBefore) {
      this.logger.log(
        `✅ Idempotencia: cached response para idempotencyKey=${idempotencyKey}`,
      );
      return cachedBefore;
    }

    // CIERRE IDEMPOTENCIA — PASO 1: lock distribuido. Cierra la race condition
    // de dos webhooks idénticos concurrentes (cada uno en una instancia de
    // Cloud Run) que de otro modo acreditarían premium dos veces.
    const lock = await this.webhookLock.acquire(idempotencyKey);
    this.logger.log(
      `Hub payment event ${resolvedEventType} (idempotencyKey=${idempotencyKey}) ` +
        `lock.acquired=${lock.acquired} backend=${lock.backend}`,
    );

    if (!lock.acquired) {
      // Otro proceso está procesando AHORA la misma key. Puede que ya haya
      // finalizado: re-chequear cache una vez.
      const cachedAfter = await this.lookupCached(idempotencyKey);
      if (cachedAfter) {
        return cachedAfter;
      }
      // Aún en proceso por el otro worker: 409 para que el Hub reintente.
      this.logger.warn(
        `⏳ idempotencyKey=${idempotencyKey} en proceso concurrente; devolviendo 409.`,
      );
      throw new ConflictException(
        'Webhook con la misma idempotency-key está siendo procesado',
      );
    }

    // Tenemos el lock: procesar dentro de la sección crítica.
    try {
      await this.paymentsService.handleHubPaymentEvent(
        resolvedEventType,
        payload,
      );
    } catch (err: any) {
      // Procesamiento falló: liberar el lock para permitir reintento del Hub.
      await this.webhookLock.releaseOnFailure(idempotencyKey);
      this.logger.error(
        `Error procesando ${resolvedEventType} (idempotencyKey=${idempotencyKey}): ${err?.message}`,
      );
      throw err;
    }

    // CIERRE IDEMPOTENCIA — PASO 2: persistir respuesta + TTL (convierte el
    // claim del lock en cache de idempotencia) y liberar el lock.
    await this.webhookLock.finalize(idempotencyKey, response, 200);
    return response;
  }
}
