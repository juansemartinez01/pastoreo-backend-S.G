// src/common/database/migrations/1770000100000-create-lotes.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLotes1770000100000 implements MigrationInterface {
  name = 'CreateLotes1770000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'est_estado_manual_lote') THEN
          CREATE TYPE est_estado_manual_lote AS ENUM (
            'DISPONIBLE',
            'OCUPADO',
            'DESCANSO',
            'NO_DISPONIBLE'
          );
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS est_lotes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,
        establecimiento_id uuid NOT NULL,
        nombre varchar(120) NOT NULL,
        hectareas numeric(14,4) NOT NULL,
        ubicacion_texto varchar(200) NULL,
        estado_manual est_estado_manual_lote NOT NULL DEFAULT 'DISPONIBLE',
        pastura_actual_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,

        CONSTRAINT fk_lote_establecimiento
          FOREIGN KEY (establecimiento_id)
          REFERENCES est_establecimientos(id)
          ON DELETE RESTRICT,

        CONSTRAINT fk_lote_pastura_actual
          FOREIGN KEY (pastura_actual_id)
          REFERENCES cat_pasturas(id)
          ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_lotes_tenant
      ON est_lotes (tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_lotes_establecimiento
      ON est_lotes (establecimiento_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_lotes_estado_manual
      ON est_lotes (estado_manual);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_lotes_pastura_actual
      ON est_lotes (pastura_actual_id);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_lotes_tenant_establecimiento_nombre
      ON est_lotes (tenant_id, establecimiento_id, nombre)
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS ux_lotes_tenant_establecimiento_nombre;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS ix_lotes_pastura_actual;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_lotes_estado_manual;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_lotes_establecimiento;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_lotes_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS est_lotes;`);
    await queryRunner.query(`DROP TYPE IF EXISTS est_estado_manual_lote;`);
  }
}
