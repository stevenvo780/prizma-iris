import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppSecretToWhatsappAccounts1765585167703 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add appSecret column to whatsapp_accounts table
        await queryRunner.query(`
            ALTER TABLE "whatsapp_accounts"
            ADD COLUMN IF NOT EXISTS "appSecret" TEXT
        `);

        // Add index on businessAccountId for faster webhook lookups
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_whatsapp_accounts_businessAccountId"
            ON "whatsapp_accounts" ("businessAccountId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove index
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_whatsapp_accounts_businessAccountId"
        `);

        // Remove column
        await queryRunner.query(`
            ALTER TABLE "whatsapp_accounts"
            DROP COLUMN IF EXISTS "appSecret"
        `);
    }

}
