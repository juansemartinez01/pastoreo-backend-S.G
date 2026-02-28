
// src/common/database/migrations/1770000000000-create-establecimientos.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEstablecimientos1770000000000 implements MigrationInterface {
  name = 'CreateEstablecimientos1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS est_establecimientos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,
        nombre varchar(120) NOT NULL,
        ubicacion_texto varchar(200) NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_establecimientos_tenant
      ON est_establecimientos (tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_establecimientos_nombre
      ON est_establecimientos (nombre);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_establecimientos_tenant_nombre
      ON est_establecimientos (tenant_id, nombre)
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS ux_establecimientos_tenant_nombre;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS ix_establecimientos_nombre;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_establecimientos_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS est_establecimientos;`);
  }
}