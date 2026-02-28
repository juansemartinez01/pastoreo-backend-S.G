// src/common/database/migrations/1770000600000-create-ga-tropas.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGaTropas1770000600000 implements MigrationInterface {
  name = 'CreateGaTropas1770000600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ga_tropas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        codigo varchar(40) NOT NULL,
        nombre varchar(120) NOT NULL,
        estado varchar(20) NOT NULL DEFAULT 'ABIERTA',

        cabezas_actuales int NOT NULL DEFAULT 0,
        peso_prom_actual numeric(14,4) NOT NULL DEFAULT 0,

        notas varchar(300) NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_tropa_codigo_tenant
      ON ga_tropas (tenant_id, codigo)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_tropa_nombre ON ga_tropas (nombre);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_tropa_estado ON ga_tropas (estado);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_tropa_estado;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_tropa_nombre;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_tropa_codigo_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ga_tropas;`);
  }
}
