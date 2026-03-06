
// src/database/migrations/1770001600000-CreateIngresosCampania.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIngresosCampania1770001600000 implements MigrationInterface {
  name = 'CreateIngresosCampania1770001600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.ag_ingresos_campania (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        campania_id uuid NOT NULL,
        categoria_id uuid NOT NULL,

        fecha date NOT NULL,

        monto_ars numeric(14,4) NOT NULL,
        monto_usd numeric(14,4) NOT NULL,
        tipo_cambio numeric(14,6) NOT NULL,

        notas varchar(300) NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,

        CONSTRAINT pk_ag_ingresos_campania PRIMARY KEY (id),

        CONSTRAINT fk_ag_ingresos_campania_campania
          FOREIGN KEY (campania_id)
          REFERENCES public.ag_campanias(id)
          ON DELETE RESTRICT,

        CONSTRAINT fk_ag_ingresos_campania_categoria
          FOREIGN KEY (categoria_id)
          REFERENCES public.cat_categorias(id)
          ON DELETE RESTRICT,

        CONSTRAINT ck_ag_ingresos_campania_monto_ars
          CHECK (monto_ars >= 0),

        CONSTRAINT ck_ag_ingresos_campania_monto_usd
          CHECK (monto_usd >= 0),

        CONSTRAINT ck_ag_ingresos_campania_tipo_cambio
          CHECK (tipo_cambio >= 0)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_ingreso_campania_tenant
      ON public.ag_ingresos_campania (tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_ingreso_campania_fecha
      ON public.ag_ingresos_campania (fecha);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_ingreso_campania_campania
      ON public.ag_ingresos_campania (campania_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_ingreso_campania_cat
      ON public.ag_ingresos_campania (categoria_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_ingreso_campania_created_at
      ON public.ag_ingresos_campania (created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_ingreso_campania_campania_fecha
      ON public.ag_ingresos_campania (campania_id, fecha);
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_proc
          WHERE proname = 'set_updated_at'
        ) THEN
          DROP TRIGGER IF EXISTS trg_ag_ingresos_campania_updated_at ON public.ag_ingresos_campania;
          CREATE TRIGGER trg_ag_ingresos_campania_updated_at
          BEFORE UPDATE ON public.ag_ingresos_campania
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at();
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_ag_ingresos_campania_updated_at ON public.ag_ingresos_campania;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_ingreso_campania_campania_fecha;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_ingreso_campania_created_at;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_ingreso_campania_cat;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_ingreso_campania_campania;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_ingreso_campania_fecha;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_ingreso_campania_tenant;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS public.ag_ingresos_campania;
    `);
  }
}