import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1758595819003 implements MigrationInterface {
    name = 'InitSchema1758595819003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."whatsapp_accounts_status_enum" AS ENUM(
                'pending',
                'active',
                'inactive',
                'suspended',
                'expired'
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."whatsapp_accounts_type_enum" AS ENUM('sandbox', 'production')
        `);
        await queryRunner.query(`
            CREATE TABLE "whatsapp_accounts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "deletedAt" TIMESTAMP,
                "name" character varying(100) NOT NULL,
                "phoneNumber" character varying(20) NOT NULL,
                "phoneNumberId" character varying(50) NOT NULL,
                "businessAccountId" character varying(50) NOT NULL,
                "accessToken" text NOT NULL,
                "status" "public"."whatsapp_accounts_status_enum" NOT NULL DEFAULT 'pending',
                "type" "public"."whatsapp_accounts_type_enum" NOT NULL DEFAULT 'sandbox',
                "webhookConfig" json,
                "limits" json,
                "metadata" json,
                "lastActiveAt" TIMESTAMP,
                "verifiedAt" TIMESTAMP,
                "isActive" boolean NOT NULL DEFAULT true,
                "userId" uuid NOT NULL,
                CONSTRAINT "UQ_f978e9049ff3ee87c31e22c0d06" UNIQUE ("phoneNumber"),
                CONSTRAINT "UQ_96651d2012cec492137a0386732" UNIQUE ("phoneNumberId"),
                CONSTRAINT "PK_7b68a09f30ca28e87f73c9e844b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_646b156196c5fc19f7b82e11ef" ON "whatsapp_accounts" ("userId", "status")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."message_logs_status_enum" AS ENUM(
                'pending',
                'queued',
                'processing',
                'sent',
                'delivered',
                'read',
                'failed',
                'retrying',
                'cancelled'
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."message_logs_type_enum" AS ENUM(
                'text',
                'template',
                'media',
                'interactive',
                'location',
                'contact'
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."message_logs_direction_enum" AS ENUM('outbound', 'inbound')
        `);
        await queryRunner.query(`
            CREATE TABLE "message_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "deletedAt" TIMESTAMP,
                "recipientNumber" character varying(20) NOT NULL,
                "status" "public"."message_logs_status_enum" NOT NULL DEFAULT 'pending',
                "type" "public"."message_logs_type_enum" NOT NULL DEFAULT 'text',
                "direction" "public"."message_logs_direction_enum" NOT NULL DEFAULT 'outbound',
                "content" text,
                "templateId" character varying(100),
                "templateParams" json,
                "mediaAttachments" json,
                "whatsappMessageId" character varying(100),
                "conversationId" character varying(100),
                "errorDetails" json,
                "retryCount" integer NOT NULL DEFAULT '0',
                "priority" integer NOT NULL DEFAULT '0',
                "scheduledAt" TIMESTAMP,
                "sentAt" TIMESTAMP,
                "deliveredAt" TIMESTAMP,
                "readAt" TIMESTAMP,
                "cost" numeric(8, 4),
                "metadata" json,
                "userId" uuid NOT NULL,
                "whatsappAccountId" uuid NOT NULL,
                CONSTRAINT "PK_f0aae0d876a96fa1da0a1b97444" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_79a2c061fde46e55407053138a" ON "message_logs" ("whatsappAccountId", "status")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_201307f64a4125a3297aecc3d8" ON "message_logs" ("recipientNumber", "createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3693d559669af88a3c87ea3a1c" ON "message_logs" ("userId", "status")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4715e1c08ebd4c37d7cc0c3cb5" ON "message_logs" ("status", "createdAt")
        `);
        await queryRunner.query(`
            CREATE TABLE "customer_tags" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "deletedAt" TIMESTAMP,
                "name" character varying(100) NOT NULL,
                "description" character varying(500),
                "color" character varying(7) NOT NULL DEFAULT '#007bff',
                "customerCount" integer NOT NULL DEFAULT '0',
                "isActive" boolean NOT NULL DEFAULT true,
                "metadata" json,
                "userId" uuid NOT NULL,
                CONSTRAINT "UQ_d9f3135693914f386b656494c2d" UNIQUE ("name", "userId"),
                CONSTRAINT "PK_339dae325423407628d43e023bd" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_969c8a7b5b974b9778e2c4b03c" ON "customer_tags" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_83d46efab6f1302547580b6060" ON "customer_tags" ("userId")
        `);
        await queryRunner.query(`
            CREATE TABLE "customer_tag_assignments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "deletedAt" TIMESTAMP,
                "customerId" uuid NOT NULL,
                "tagId" uuid NOT NULL,
                "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "assignedBy" character varying(255),
                "metadata" json,
                CONSTRAINT "UQ_e1d29ccc0dbaa0f9555b8757782" UNIQUE ("customerId", "tagId"),
                CONSTRAINT "PK_4a82b7dd3056db79810d5791b47" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2d768c44677ba44c8a3d84f5ee" ON "customer_tag_assignments" ("tagId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6b39552e53351a161bac2f4c4c" ON "customer_tag_assignments" ("customerId")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."customers_status_enum" AS ENUM('active', 'inactive', 'blocked', 'opted_out')
        `);
        await queryRunner.query(`
            CREATE TABLE "customers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "deletedAt" TIMESTAMP,
                "firstName" character varying(100) NOT NULL,
                "lastName" character varying(100) NOT NULL,
                "phoneNumber" character varying(20) NOT NULL,
                "email" character varying(255),
                "status" "public"."customers_status_enum" NOT NULL DEFAULT 'active',
                "customFields" json,
                "notes" text,
                "lastContactAt" TIMESTAMP,
                "optInAt" TIMESTAMP,
                "optOutAt" TIMESTAMP,
                "language" character varying(10),
                "timezone" character varying(10),
                "preferences" json,
                "metadata" json,
                "userId" uuid NOT NULL,
                CONSTRAINT "UQ_3e418bff40d3abac5642cd5d398" UNIQUE ("phoneNumber"),
                CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_27b27cab1a6277e9f194a401e0" ON "customers" ("userId", "status")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user', 'premium')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended')
        `);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "deletedAt" TIMESTAMP,
                "firstName" character varying(100) NOT NULL,
                "lastName" character varying(100) NOT NULL,
                "email" character varying(255) NOT NULL,
                "password" character varying(255) NOT NULL,
                "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
                "status" "public"."users_status_enum" NOT NULL DEFAULT 'active',
                "credits" numeric(10, 2) NOT NULL DEFAULT '0',
                "settings" json,
                "lastLoginAt" TIMESTAMP,
                "emailVerified" boolean NOT NULL DEFAULT false,
                "emailVerificationToken" character varying(255),
                "passwordResetToken" character varying(255),
                "passwordResetExpiresAt" TIMESTAMP,
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."templates_category_enum" AS ENUM('MARKETING', 'UTILITY', 'AUTHENTICATION')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."templates_language_enum" AS ENUM('es', 'en', 'pt')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."templates_status_enum" AS ENUM(
                'draft',
                'pending',
                'approved',
                'rejected',
                'disabled'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "templates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "deletedAt" TIMESTAMP,
                "name" character varying(100) NOT NULL,
                "category" "public"."templates_category_enum" NOT NULL DEFAULT 'UTILITY',
                "language" "public"."templates_language_enum" NOT NULL DEFAULT 'es',
                "status" "public"."templates_status_enum" NOT NULL DEFAULT 'draft',
                "body" text NOT NULL,
                "header" json,
                "footer" json,
                "buttons" json,
                "parameters" json,
                "whatsappTemplateId" character varying(100),
                "rejectionReason" json,
                "submittedAt" TIMESTAMP,
                "approvedAt" TIMESTAMP,
                "rejectedAt" TIMESTAMP,
                "usageCount" integer NOT NULL DEFAULT '0',
                "active" boolean NOT NULL DEFAULT true,
                "metadata" json,
                "userId" uuid NOT NULL,
                CONSTRAINT "PK_515948649ce0bbbe391de702ae5" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1186b06846c57f6b497dac6c16" ON "templates" ("status", "userId")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_aab7c30b6710d97cb84d602774" ON "templates" ("name", "userId")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."pending_messages_status_enum" AS ENUM(
                'waiting_opt_in',
                'opt_in_sent',
                'expired',
                'processed',
                'cancelled'
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."pending_messages_type_enum" AS ENUM(
                'text',
                'template',
                'media',
                'interactive',
                'location',
                'contact'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "pending_messages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
                "deletedAt" TIMESTAMP,
                "recipientNumber" character varying(20) NOT NULL,
                "status" "public"."pending_messages_status_enum" NOT NULL DEFAULT 'waiting_opt_in',
                "type" "public"."pending_messages_type_enum" NOT NULL,
                "content" text,
                "templateId" character varying(255),
                "templateParams" json,
                "mediaAttachments" json,
                "scheduledAt" TIMESTAMP,
                "priority" integer NOT NULL DEFAULT '0',
                "optInSentAt" TIMESTAMP,
                "optInReceivedAt" TIMESTAMP,
                "processedAt" TIMESTAMP,
                "expiresAt" TIMESTAMP,
                "optInAttempts" integer NOT NULL DEFAULT '0',
                "metadata" json,
                "userId" uuid NOT NULL,
                "customerId" uuid,
                CONSTRAINT "PK_471bcc73e023ff7f77e96a4e80d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_44d0a2e663a27913fe257b24d8" ON "pending_messages" ("status", "createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_aa39bfe257d024ebbbfb7acefc" ON "pending_messages" ("recipientNumber", "userId")
        `);
        await queryRunner.query(`
            CREATE TABLE "message_templates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "content" text NOT NULL,
                "mediaAttachments" jsonb,
                "active" boolean NOT NULL DEFAULT true,
                "order" integer,
                "userId" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_9ac2bd9635be662d183f314947d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "whatsapp_accounts"
            ADD CONSTRAINT "FK_1a7dce21f7796d697e0538571ad" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "message_logs"
            ADD CONSTRAINT "FK_b1ca317a226af3aef10c2a24d83" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "message_logs"
            ADD CONSTRAINT "FK_840b1a736336ae3706a7f14ab8e" FOREIGN KEY ("whatsappAccountId") REFERENCES "whatsapp_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "customer_tags"
            ADD CONSTRAINT "FK_83d46efab6f1302547580b60603" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "customer_tag_assignments"
            ADD CONSTRAINT "FK_6b39552e53351a161bac2f4c4c0" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "customer_tag_assignments"
            ADD CONSTRAINT "FK_2d768c44677ba44c8a3d84f5ee6" FOREIGN KEY ("tagId") REFERENCES "customer_tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "customers"
            ADD CONSTRAINT "FK_b8512aa9cef03d90ed5744c94d7" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "templates"
            ADD CONSTRAINT "FK_7193babbf16087eb6107606dfe3" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "pending_messages"
            ADD CONSTRAINT "FK_c52db4cea33460eb8a169bcdafa" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "pending_messages"
            ADD CONSTRAINT "FK_458fd52c411702dbf59e3c293b7" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "pending_messages" DROP CONSTRAINT "FK_458fd52c411702dbf59e3c293b7"
        `);
        await queryRunner.query(`
            ALTER TABLE "pending_messages" DROP CONSTRAINT "FK_c52db4cea33460eb8a169bcdafa"
        `);
        await queryRunner.query(`
            ALTER TABLE "templates" DROP CONSTRAINT "FK_7193babbf16087eb6107606dfe3"
        `);
        await queryRunner.query(`
            ALTER TABLE "customers" DROP CONSTRAINT "FK_b8512aa9cef03d90ed5744c94d7"
        `);
        await queryRunner.query(`
            ALTER TABLE "customer_tag_assignments" DROP CONSTRAINT "FK_2d768c44677ba44c8a3d84f5ee6"
        `);
        await queryRunner.query(`
            ALTER TABLE "customer_tag_assignments" DROP CONSTRAINT "FK_6b39552e53351a161bac2f4c4c0"
        `);
        await queryRunner.query(`
            ALTER TABLE "customer_tags" DROP CONSTRAINT "FK_83d46efab6f1302547580b60603"
        `);
        await queryRunner.query(`
            ALTER TABLE "message_logs" DROP CONSTRAINT "FK_840b1a736336ae3706a7f14ab8e"
        `);
        await queryRunner.query(`
            ALTER TABLE "message_logs" DROP CONSTRAINT "FK_b1ca317a226af3aef10c2a24d83"
        `);
        await queryRunner.query(`
            ALTER TABLE "whatsapp_accounts" DROP CONSTRAINT "FK_1a7dce21f7796d697e0538571ad"
        `);
        await queryRunner.query(`
            DROP TABLE "message_templates"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_aa39bfe257d024ebbbfb7acefc"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_44d0a2e663a27913fe257b24d8"
        `);
        await queryRunner.query(`
            DROP TABLE "pending_messages"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."pending_messages_type_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."pending_messages_status_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_aab7c30b6710d97cb84d602774"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1186b06846c57f6b497dac6c16"
        `);
        await queryRunner.query(`
            DROP TABLE "templates"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."templates_status_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."templates_language_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."templates_category_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."users_status_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."users_role_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_27b27cab1a6277e9f194a401e0"
        `);
        await queryRunner.query(`
            DROP TABLE "customers"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."customers_status_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6b39552e53351a161bac2f4c4c"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2d768c44677ba44c8a3d84f5ee"
        `);
        await queryRunner.query(`
            DROP TABLE "customer_tag_assignments"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_83d46efab6f1302547580b6060"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_969c8a7b5b974b9778e2c4b03c"
        `);
        await queryRunner.query(`
            DROP TABLE "customer_tags"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4715e1c08ebd4c37d7cc0c3cb5"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3693d559669af88a3c87ea3a1c"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_201307f64a4125a3297aecc3d8"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_79a2c061fde46e55407053138a"
        `);
        await queryRunner.query(`
            DROP TABLE "message_logs"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."message_logs_direction_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."message_logs_type_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."message_logs_status_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_646b156196c5fc19f7b82e11ef"
        `);
        await queryRunner.query(`
            DROP TABLE "whatsapp_accounts"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."whatsapp_accounts_type_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."whatsapp_accounts_status_enum"
        `);
    }

}
