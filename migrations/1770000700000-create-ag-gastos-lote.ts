// src/common/database/migrations/1770000700000-create-ag-gastos-lote.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgGastosLote1770000700000 implements MigrationInterface {
  name = 'CreateAgGastosLote1770000700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ag_gastos_lote (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        lote_id uuid NOT NULL,
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
      `CREATE INDEX IF NOT EXISTS ix_gasto_lote_fecha ON ag_gastos_lote (fecha);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_gasto_lote_lote ON ag_gastos_lote (lote_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_gasto_lote_prov ON ag_gastos_lote (proveedor_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_gasto_lote_cat ON ag_gastos_lote (categoria_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_gasto_lote_cat;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_gasto_lote_prov;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_gasto_lote_lote;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_gasto_lote_fecha;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ag_gastos_lote;`);
  }
}
