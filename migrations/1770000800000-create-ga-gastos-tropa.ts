// src/common/database/migrations/1770000800000-create-ga-gastos-tropa.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGaGastosTropa1770000800000 implements MigrationInterface {
  name = 'CreateGaGastosTropa1770000800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ga_gastos_tropa (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        tropa_id uuid NOT NULL,
        proveedor_id uuid NULL,
        categoria_id uuid NOT NULL,

        fecha date NOT NULL,

        monto_ars numeric(14,4) NOT NULL,
        monto_usd numeric(14,4) NOT NULL,
        tipo_cambio numeric(14,6) NOT NULL,

        notas varchar(300) NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_gasto_tropa_fecha ON ga_gastos_tropa (fecha);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_gasto_tropa_tropa ON ga_gastos_tropa (tropa_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_gasto_tropa_prov ON ga_gastos_tropa (proveedor_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_gasto_tropa_cat ON ga_gastos_tropa (categoria_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_gasto_tropa_cat;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_gasto_tropa_prov;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_gasto_tropa_tropa;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_gasto_tropa_fecha;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ga_gastos_tropa;`);
  }
}
