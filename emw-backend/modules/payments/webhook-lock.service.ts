import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyKey } from './entities/idempotency-key.entity';

/**
 * Token DI para un cliente Redis OPCIONAL.
 *
 * Hoy Iris NO tiene un cliente Redis cableado (existe `config/redis.config.ts`
 * pero ningún provider instancia ioredis/redis). Por eso este token resuelve a
 * `null` salvo que un módulo lo provea explícitamente. Cuando se cablee Redis,
 * basta con registrar un provider:
 *
 *   { provide: REDIS_LOCK_CLIENT, useFactory: () => new Redis(...) }
 *
 * y el locking distribuido pasa automáticamente al modo Redis (SET NX PX).
 *
 * IMPORTANTE: este archivo NO importa estáticamente ningún paquete Redis para
 * no romper el build (`tsc`) cuando la dependencia no está instalada. El cliente
 * se consume de forma "duck-typed" mediante {@link RedisLikeClient}.
 */
export const REDIS_LOCK_CLIENT = Symbol('REDIS_LOCK_CLIENT');

/**
 * Subconjunto mínimo de la API de un cliente Redis (ioredis/node-redis) que
 * necesitamos para el lock distribuido. Tipado estructural → no requiere el
 * paquete instalado.
 */
export interface RedisLikeClient {
  /** SET key value [NX] [PX ms]. Debe devolver 'OK' si se obtuvo, null si NX falló. */
  set(
    key: string,
    value: string,
    mode?: string,
    duration?: number,
    flag?: string,
  ): Promise<string | null>;
  /** Liberar el lock (DEL). */
  del(key: string): Promise<number>;
}

/**
 * Resultado de intentar adquirir el lock de procesamiento de un webhook.
 *
 * - acquired=true  → este proceso ES el dueño; debe procesar y luego release().
 * - acquired=false → otro proceso ya está procesando la MISMA idempotencyKey
 *                    concurrentemente; el caller debe responder 409/202 sin
 *                    re-procesar (evita el doble crédito).
 */
export interface LockResult {
  acquired: boolean;
  /** Backend que resolvió el lock: 'redis' | 'db' | 'noop'. Para observabilidad. */
  backend: 'redis' | 'db' | 'noop';
}

/**
 * Postgres unique_violation. Disparado por el índice UNIQUE
 * `IDX_idempotency_key_value` cuando dos webhooks idénticos insertan a la vez.
 */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * WebhookLockService — locking DISTRIBUIDO para cerrar la race condition de
 * idempotencia de webhooks de pago.
 *
 * PROBLEMA: dos webhooks idénticos (mismo x-idempotency-key) llegando en
 * paralelo a dos instancias de Cloud Run. Ambos consultan la tabla de
 * idempotencia, ninguno encuentra cache todavía, ambos procesan → DOBLE
 * crédito de premium.
 *
 * SOLUCIÓN (fail-closed, dos backends):
 *   1. Redis (preferido si hay cliente): SET key NX PX <ttl>. El primero gana;
 *      el resto recibe acquired=false.
 *   2. DB (fallback siempre disponible): INSERT atómico de una fila "claim" en
 *      `idempotency_keys`. El índice UNIQUE garantiza que solo UN proceso
 *      inserta; los demás reciben 23505 → acquired=false. Esto cierra la race
 *      sin Redis, usando infra que ya existe (la tabla compartida por todas las
 *      instancias).
 *
 * Si NINGÚN backend está disponible (no debería ocurrir: la DB siempre está),
 * degrada a acquired=true con backend='noop' para no bloquear el pago, dejando
 * la verificación de estado existente (Payment.status) como última red.
 */
@Injectable()
export class WebhookLockService {
  private readonly logger = new Logger(WebhookLockService.name);

  /** TTL del lock/claim en ms. Cubre de sobra un procesamiento de webhook. */
  private readonly LOCK_TTL_MS = 60_000;

  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyKeyRepository: Repository<IdempotencyKey>,
    @Optional()
    @Inject(REDIS_LOCK_CLIENT)
    private readonly redis: RedisLikeClient | null,
  ) {
    if (this.redis) {
      this.logger.log('WebhookLockService: backend=Redis (SET NX PX)');
    } else {
      this.logger.log(
        'WebhookLockService: sin Redis → backend=DB (INSERT atómico sobre índice UNIQUE)',
      );
    }
  }

  /**
   * Intenta adquirir el lock exclusivo para procesar `idempotencyKey`.
   * Devuelve acquired=false si otro proceso ya lo tiene (responder 409/202).
   */
  async acquire(idempotencyKey: string): Promise<LockResult> {
    // ── Backend 1: Redis (si está cableado) ──
    if (this.redis) {
      try {
        const lockKey = `lock:idem:${idempotencyKey}`;
        // SET key 1 NX PX <ttl> → 'OK' si lo tomamos, null si ya existía.
        const res = await this.redis.set(
          lockKey,
          '1',
          'PX',
          this.LOCK_TTL_MS,
          'NX',
        );
        return { acquired: res === 'OK', backend: 'redis' };
      } catch (err: any) {
        // Si Redis falla, NO abrimos la puerta: caemos al claim de DB, que es
        // igualmente seguro. (fail-closed)
        this.logger.warn(
          `Redis lock falló para ${idempotencyKey}: ${err?.message}. Fallback a DB claim.`,
        );
      }
    }

    // ── Backend 2: DB claim atómico (siempre disponible) ──
    // INSERT ... ON CONFLICT DO UPDATE ... WHERE expirado: en UNA sola sentencia
    // atómica el ganador inserta una fila "claim" nueva O reclama una existente
    // ya EXPIRADA. Si la fila existe y NO está expirada (otro proceso la tiene o
    // ya hay cache válido) el UPDATE no aplica y RETURNING viene vacío → no
    // adquirido. Esto cierra la race sin Redis usando el índice UNIQUE.
    try {
      const expiresAt = new Date(Date.now() + this.LOCK_TTL_MS);
      const claim = JSON.stringify({ __claim: true });
      const rows = await this.idempotencyKeyRepository.query(
        `INSERT INTO "idempotency_keys"
           ("idempotencyKey", "cachedResponse", "statusCode", "expiresAt")
         VALUES ($1, $2::json, 0, $3)
         ON CONFLICT ("idempotencyKey") DO UPDATE
           SET "cachedResponse" = EXCLUDED."cachedResponse",
               "statusCode"     = 0,
               "expiresAt"      = EXCLUDED."expiresAt"
           WHERE "idempotency_keys"."expiresAt" < now()
         RETURNING "id"`,
        [idempotencyKey, claim, expiresAt],
      );
      return { acquired: rows.length > 0, backend: 'db' };
    } catch (err: any) {
      const code = err?.code ?? err?.driverError?.code;
      if (code === PG_UNIQUE_VIOLATION) {
        // Carrera entre el INSERT y el ON CONFLICT (raro) → otro lo tomó.
        return { acquired: false, backend: 'db' };
      }
      // Error inesperado de DB: NO procesamos a ciegas (fail-closed). Tratamos
      // como "no adquirido" para que el caller responda 409 y el Hub reintente.
      this.logger.error(
        `Error inesperado en DB claim para ${idempotencyKey}: ${err?.message}`,
      );
      return { acquired: false, backend: 'db' };
    }
  }

  /**
   * Libera el lock tras un procesamiento FALLIDO, para permitir un reintento
   * inmediato del Hub. En éxito NO se llama: la fila se actualiza con la
   * respuesta final (vía finalize) y queda como cache de idempotencia.
   */
  async releaseOnFailure(idempotencyKey: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(`lock:idem:${idempotencyKey}`);
      } catch (err: any) {
        this.logger.warn(
          `Redis release falló para ${idempotencyKey}: ${err?.message}`,
        );
      }
    }
    // En backend DB borramos la fila "claim" para que el reintento pueda
    // re-adquirir. Solo borra si sigue siendo un claim (statusCode=0).
    try {
      await this.idempotencyKeyRepository.delete({
        idempotencyKey,
        statusCode: 0,
      });
    } catch (err: any) {
      this.logger.warn(
        `DB release falló para ${idempotencyKey}: ${err?.message}`,
      );
    }
  }

  /**
   * Confirma el procesamiento EXITOSO: convierte la fila "claim" en una entrada
   * de cache de idempotencia real (respuesta + TTL largo). Idempotente: si Redis
   * tenía el lock, lo libera (la dedupe persistente vive en la fila de DB).
   */
  async finalize(
    idempotencyKey: string,
    cachedResponse: Record<string, any>,
    statusCode: number,
    ttlMs: number = 24 * 60 * 60 * 1000,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMs);
    try {
      // upsert: si el claim existe lo actualiza; si por algún motivo no, lo crea.
      const existing = await this.idempotencyKeyRepository.findOne({
        where: { idempotencyKey },
      });
      if (existing) {
        existing.cachedResponse = cachedResponse;
        existing.statusCode = statusCode;
        existing.expiresAt = expiresAt;
        await this.idempotencyKeyRepository.save(existing);
      } else {
        await this.idempotencyKeyRepository.save({
          idempotencyKey,
          cachedResponse,
          statusCode,
          expiresAt,
        });
      }
    } catch (err: any) {
      // best-effort: el procesamiento ya ocurrió; un fallo aquí solo afecta el
      // cache de reintentos, no la corrección.
      this.logger.warn(
        `finalize() no pudo persistir cache para ${idempotencyKey}: ${err?.message}`,
      );
    }

    if (this.redis) {
      try {
        await this.redis.del(`lock:idem:${idempotencyKey}`);
      } catch {
        /* lock expira solo vía PX; ignorar */
      }
    }
  }
}
