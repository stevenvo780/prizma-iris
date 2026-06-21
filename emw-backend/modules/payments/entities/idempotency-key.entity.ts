import { BaseEntity } from '../../shared/entities/base.entity';
import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Payment } from './payment.entity';

/**
 * Entidad para persistencia de idempotencyKey del Hub (x-idempotency-key).
 *
 * PROPÓSITO:
 * El Hub puede reintentar el mismo webhook si no recibe una respuesta 2xx.
 * Sin persistencia, segundo intento → segundo crédito/error. Esta entidad
 * deduplicaría el webhook global: (idempotencyKey, status, response).
 *
 * CICLO DE VIDA:
 * - Webhook entra con x-idempotency-key: "mp:12345:pago.aprobado"
 * - Handler: (1) consulta DB por idempotencyKey, (2) si existe + NO EXPIRED →
 *   retorna cached response, (3) si NO existe → procesa + persiste (idempotencyKey,
 *   cachedResponse, statusCode, expiresAt = now + 24h), (4) next retry dentro de 24h
 *   recibe cached response.
 *
 * TTL: 24 horas (típicamente el Hub reintentar es < 1h, así que sobrado).
 *
 * DEFERRED:
 * - Sin locking distribuido: si 2+ procesos reciben el mismo idempotencyKey
 *   simultáneamente, ambos procesarán. Mitigación: Payment.status check
 *   redundante dentro de handleHubPaymentEvent (ver código en payments.service.ts
 *   línea 306-309).
 * - Limpieza automática: requeriría un job cron (deferred a Phase 2).
 */
@Entity('idempotency_keys')
@Index('IDX_idempotency_key_value', ['idempotencyKey'], { unique: true })
@Index('IDX_idempotency_key_expiresAt', ['expiresAt'])
export class IdempotencyKey extends BaseEntity {
  /**
   * Clave de idempotencia extraída del header x-idempotency-key.
   * Formato típico: "mp:<mpId>:<eventType>" o "hub:<eventId>".
   * Unique para evitar duplicados.
   */
  @Column({ type: 'varchar', length: 255 })
  idempotencyKey: string;

  /**
   * Respuesta HTTP cacheada del primer procesamiento.
   * JSON del body que se devuelve en reintentos.
   * Ej: { ok: true, event: "pago.aprobado", processedAt: "2026-06-20T..." }
   */
  @Column({ type: 'json' })
  cachedResponse: Record<string, any>;

  /**
   * Status code HTTP que se devolvió (200, 202, 400, 401, 500...).
   * En reintentos se replica exacto.
   */
  @Column({ type: 'int', default: 200 })
  statusCode: number;

  /**
   * Timestamp de expiración (TTL). Tras esta fecha, el handler puede
   * re-procesar el mismo idempotencyKey (fallback a procesamiento completo).
   * Default: 24h desde creación.
   */
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  /**
   * Relación opcional a Payment si el webhook está vinculado a un pago.
   * Permite queries rápidas de "todos los webhooks de este pago".
   * Nullable si el webhook no está asociado a Payment (ej: webhook de notificación).
   */
  @ManyToOne(() => Payment, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment?: Payment;

  @Column({ type: 'uuid', nullable: true })
  paymentId?: string;
}
