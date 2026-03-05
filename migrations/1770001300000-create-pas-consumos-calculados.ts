// src/common/database/migrations/1770001300000-create-pas-consumos-calculados.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasConsumosCalculados1770001300000 implements MigrationInterface {
  name = 'CreatePasConsumosCalculados1770001300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pas_consumos_calculados (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        ocupacion_id uuid NOT NULL,
        tropa_id uuid NOT NULL,

        fecha_desde date NOT NULL,
        fecha_hasta date NOT NULL,

        kg_consumidos numeric(18,4) NOT NULL,

        precio_kg_ars_snapshot numeric(14,4) NOT NULL,
        precio_kg_usd_snapshot numeric(14,4) NOT NULL,
        tipo_cambio_snapshot numeric(14,6) NOT NULL,

        regla_version int NOT NULL,
        datos_base jsonb NOT NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_cons_tenant ON pas_consumos_calculados (tenant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_cons_ocup ON pas_consumos_calculados (ocupacion_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_cons_tropa ON pas_consumos_calculados (tropa_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_cons_fechas ON pas_consumos_calculados (fecha_desde, fecha_hasta);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_cons_ocup_tropa
      ON pas_consumos_calculados (tenant_id, ocupacion_id, tropa_id)
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_cons_ocup_tropa;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_cons_fechas;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_cons_tropa;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_cons_ocup;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_cons_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS pas_consumos_calculados;`);
  }
}
