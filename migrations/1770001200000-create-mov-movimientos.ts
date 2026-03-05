// src/common/database/migrations/1770001200000-create-mov-movimientos.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMovMovimientos1770001200000 implements MigrationInterface {
  name = 'CreateMovMovimientos1770001200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mov_movimientos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        area varchar(10) NOT NULL, -- AGRI | GANA
        tipo varchar(40) NOT NULL, -- ALIMENTO_INTERNO, etc

        source_type varchar(40) NOT NULL, -- OCUPACION
        source_id uuid NOT NULL,

        group_id uuid NOT NULL,
        fecha date NOT NULL,

        monto_ars numeric(18,2) NOT NULL,
        monto_usd numeric(18,2) NOT NULL,
        tipo_cambio numeric(14,6) NOT NULL,

        descripcion varchar(300) NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_mov_tenant ON mov_movimientos (tenant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_mov_fecha ON mov_movimientos (fecha);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_mov_tipo ON mov_movimientos (tipo);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_mov_source ON mov_movimientos (source_type, source_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_mov_group ON mov_movimientos (group_id);
    `);

    // ✅ Idempotencia para ALIMENTO_INTERNO:
    // “para esta ocupación y esta area, solo 1 movimiento activo”
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_mov_alimento_source_area
      ON mov_movimientos (tenant_id, tipo, source_type, source_id, area)
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS ux_mov_alimento_source_area;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS ix_mov_group;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_mov_source;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_mov_tipo;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_mov_fecha;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_mov_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS mov_movimientos;`);
  }
}
