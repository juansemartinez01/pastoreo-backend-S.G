// src/common/database/migrations/1770000500000-create-docs-adjuntos.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocsAdjuntos1770000500000 implements MigrationInterface {
  name = 'CreateDocsAdjuntos1770000500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS docs_adjuntos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        owner_type varchar(60) NOT NULL,
        owner_id uuid NOT NULL,

        asset_id varchar(200) NULL,
        url varchar(500) NOT NULL,
        mime varchar(120) NULL,
        original_name varchar(260) NULL,
        size_bytes bigint NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_adjuntos_tenant
      ON docs_adjuntos (tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_adjuntos_owner
      ON docs_adjuntos (owner_type, owner_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_adjuntos_owner;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_adjuntos_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS docs_adjuntos;`);
  }
}
