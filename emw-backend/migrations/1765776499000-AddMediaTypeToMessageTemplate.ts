import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaTypeToMessageTemplate1734237600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE message_templates
      ADD COLUMN IF NOT EXISTS "mediaType" VARCHAR(50) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE message_templates
      DROP COLUMN IF EXISTS "mediaType"
    `);
  }
}
