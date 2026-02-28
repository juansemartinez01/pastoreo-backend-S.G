// src/common/database/migrations/1770000900000-create-pas-ocupaciones.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasOcupaciones1770000900000 implements MigrationInterface {
  name = 'CreatePasOcupaciones1770000900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pas_ocupaciones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        lote_id uuid NOT NULL,
        fecha_desde date NOT NULL,
        fecha_hasta date NULL,

        estado varchar(20) NOT NULL DEFAULT 'ABIERTA',
        pastura_id_snapshot uuid NULL,
        notas varchar(300) NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    // 1 ocupación ABIERTA por lote (consistencia mínima MVP)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_ocup_abierta_por_lote
      ON pas_ocupaciones (tenant_id, lote_id)
      WHERE deleted_at IS NULL AND estado = 'ABIERTA';
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_ocup_lote ON pas_ocupaciones (lote_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_ocup_estado ON pas_ocupaciones (estado);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_ocup_fechas ON pas_ocupaciones (fecha_desde, fecha_hasta);`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pas_ocupacion_tropas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        ocupacion_id uuid NOT NULL,
        tropa_id uuid NOT NULL,

        cabezas_inicio int NOT NULL,
        cabezas_fin int NULL,

        peso_inicio numeric(14,4) NOT NULL,
        peso_fin numeric(14,4) NULL,

        aumento_diario numeric(14,6) NOT NULL DEFAULT 0,
        factor_engorde numeric(14,6) NOT NULL DEFAULT 0,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_ocup_tropa
      ON pas_ocupacion_tropas (tenant_id, ocupacion_id, tropa_id)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_ocup_tropa_ocup ON pas_ocupacion_tropas (ocupacion_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_ocup_tropa_tropa ON pas_ocupacion_tropas (tropa_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_ocup_tropa_tropa;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_ocup_tropa_ocup;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_ocup_tropa;`);
    await queryRunner.query(`DROP TABLE IF EXISTS pas_ocupacion_tropas;`);

    await queryRunner.query(`DROP INDEX IF EXISTS ix_ocup_fechas;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_ocup_estado;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_ocup_lote;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_ocup_abierta_por_lote;`);
    await queryRunner.query(`DROP TABLE IF EXISTS pas_ocupaciones;`);
  }
}
