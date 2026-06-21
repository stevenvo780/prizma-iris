import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración: Crear tabla idempotency_keys para persistencia del webhook del Hub.
 *
 * PROPÓSITO:
 * El Hub (Nous) puede reintentar webhooks si no recibe respuesta 2xx. Sin
 * persistencia de x-idempotency-key, segundo intento → segundo procesamiento
 * (doble crédito, doble cobro, etc.). Esta tabla implementa el patrón de
 * deduplicación Outbox / Idempotency: guardar (key, response, TTL).
 *
 * SCHEMA:
 * - id: UUID PK
 * - idempotencyKey: varchar(255) UNIQUE, ej: "mp:12345:pago.aprobado"
 * - cachedResponse: JSON, respuesta HTTP que se retorna en reintentos
 * - statusCode: int, status HTTP (200, 202, etc.)
 * - expiresAt: timestamp, TTL (default 24h)
 * - paymentId: UUID FK → payments.id (nullable, para vinculación futura)
 * - createdAt, updatedAt: timestamps
 *
 * ÍNDICES:
 * - IDX_idempotency_key_value: UNIQUE en idempotencyKey (búsqueda rápida)
 * - IDX_idempotency_key_expiresAt: en expiresAt (limpieza/TTL)
 *
 * CICLO DE VIDA:
 * 1. Webhook entra con x-idempotency-key
 * 2. Handler consulta tabla → si EXISTS + NOT EXPIRED → cached response (200)
 * 3. Si NO EXISTS → procesa + persiste (id, idempotencyKey, cachedResponse, 200, expiresAt=now+24h)
 * 4. Próximo reintento del Hub → cached response dentro de 24h
 * 5. Tras 24h → puede re-procesarse (fallback a full processing)
 *
 * DEFERRED (Phase 2):
 * - Limpieza automática de registros expirados (job cron)
 * - Locking distribuido para evitar race condition entre múltiples procesos
 */
export class CreateIdempotencyKeyTable1766242800000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear tabla idempotency_keys
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "idempotency_keys" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "idempotencyKey" character varying(255) NOT NULL,
                "cachedResponse" json NOT NULL,
                "statusCode" integer NOT NULL DEFAULT 200,
                "expiresAt" TIMESTAMP NOT NULL,
                "paymentId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "deletedAt" TIMESTAMP,
                CONSTRAINT "PK_idempotency_keys_id" PRIMARY KEY ("id")
            )
        `);

        // Índice UNIQUE en idempotencyKey (búsqueda rápida de deduplicación)
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "IDX_idempotency_key_value"
            ON "idempotency_keys" ("idempotencyKey")
        `);

        // Índice en expiresAt (limpieza de registros vencidos)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_idempotency_key_expiresAt"
            ON "idempotency_keys" ("expiresAt")
        `);

        // Foreign key a payments.id (si existe; nullable)
        await queryRunner.query(`
            ALTER TABLE "idempotency_keys"
            ADD CONSTRAINT "FK_idempotency_key_paymentId"
            FOREIGN KEY ("paymentId") REFERENCES "payments" ("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop FK
        await queryRunner.query(`
            ALTER TABLE "idempotency_keys"
            DROP CONSTRAINT IF EXISTS "FK_idempotency_key_paymentId"
        `);

        // Drop índices
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_idempotency_key_expiresAt"
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_idempotency_key_value"
        `);

        // Drop tabla
        await queryRunner.query(`
            DROP TABLE IF EXISTS "idempotency_keys"
        `);
    }
}
