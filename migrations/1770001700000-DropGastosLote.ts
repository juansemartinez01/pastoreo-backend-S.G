// src/database/migrations/1770001700000-DropGastosLote.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropGastosLote1770001700000 implements MigrationInterface {
  name = 'DropGastosLote1770001700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_ag_gastos_lote_updated_at ON public.ag_gastos_lote;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_gasto_lote_cat;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_gasto_lote_prov;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_gasto_lote_lote;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_gasto_lote_fecha;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS public.ag_gastos_lote;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.ag_gastos_lote (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
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
        deleted_at timestamptz NULL,

        CONSTRAINT pk_ag_gastos_lote PRIMARY KEY (id),

        CONSTRAINT fk_ag_gastos_lote_lote
          FOREIGN KEY (lote_id)
          REFERENCES public.est_lotes(id)
          ON DELETE RESTRICT,

        CONSTRAINT fk_ag_gastos_lote_proveedor
          FOREIGN KEY (proveedor_id)
          REFERENCES public.prov_proveedores(id)
          ON DELETE RESTRICT,

        CONSTRAINT fk_ag_gastos_lote_categoria
          FOREIGN KEY (categoria_id)
          REFERENCES public.cat_categorias(id)
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_gasto_lote_fecha
      ON public.ag_gastos_lote (fecha);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_gasto_lote_lote
      ON public.ag_gastos_lote (lote_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_gasto_lote_prov
      ON public.ag_gastos_lote (proveedor_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_gasto_lote_cat
      ON public.ag_gastos_lote (categoria_id);
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_proc
          WHERE proname = 'set_updated_at'
        ) THEN
          DROP TRIGGER IF EXISTS trg_ag_gastos_lote_updated_at ON public.ag_gastos_lote;
          CREATE TRIGGER trg_ag_gastos_lote_updated_at
          BEFORE UPDATE ON public.ag_gastos_lote
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at();
        END IF;
      END
      $$;
    `);
  }
}
