// src/database/migrations/1770001400000-CreateCampanias.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCampanias1770001400000 implements MigrationInterface {
  name = 'CreateCampanias1770001400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================
    // ENUMS
    // =========================================================
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'ag_campanias_estado_actual_enum'
        ) THEN
          CREATE TYPE public.ag_campanias_estado_actual_enum AS ENUM (
            'BORRADOR',
            'DISPONIBLE',
            'IMPLANTADA',
            'EN_CRECIMIENTO',
            'LISTA',
            'OCUPADA',
            'DESCANSO',
            'CERRADA'
          );
        END IF;
      END
      $$;
    `);

    // =========================================================
    // TABLA ag_campanias
    // =========================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.ag_campanias (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        lote_id uuid NOT NULL,
        pastura_id uuid NOT NULL,

        nombre varchar(140) NOT NULL,
        fecha_inicio date NOT NULL,
        fecha_cierre date NULL,

        estado_actual public.ag_campanias_estado_actual_enum NOT NULL DEFAULT 'BORRADOR',
        notas varchar(300) NULL,

        lote_nombre_snapshot varchar(120) NOT NULL,
        pastura_nombre_snapshot varchar(120) NOT NULL,
        hectareas_snapshot numeric(14,4) NOT NULL,

        total_gastos_ars numeric(14,4) NOT NULL DEFAULT 0,
        total_gastos_usd numeric(14,4) NOT NULL DEFAULT 0,
        total_ingresos_ars numeric(14,4) NOT NULL DEFAULT 0,
        total_ingresos_usd numeric(14,4) NOT NULL DEFAULT 0,
        resultado_ars numeric(14,4) NOT NULL DEFAULT 0,
        resultado_usd numeric(14,4) NOT NULL DEFAULT 0,

        resumen_cierre jsonb NULL DEFAULT NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,

        CONSTRAINT pk_ag_campanias PRIMARY KEY (id),

        CONSTRAINT fk_ag_campanias_lote
          FOREIGN KEY (lote_id)
          REFERENCES public.est_lotes(id)
          ON DELETE RESTRICT,

        CONSTRAINT fk_ag_campanias_pastura
          FOREIGN KEY (pastura_id)
          REFERENCES public.cat_pasturas(id)
          ON DELETE RESTRICT,

        CONSTRAINT ck_ag_campanias_fechas
          CHECK (
            fecha_cierre IS NULL
            OR fecha_cierre >= fecha_inicio
          )
      );
    `);

    // =========================================================
    // TABLA ag_campanias_estado_historial
    // =========================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.ag_campanias_estado_historial (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        campania_id uuid NOT NULL,
        estado public.ag_campanias_estado_actual_enum NOT NULL,

        fecha_desde date NOT NULL,
        fecha_hasta date NULL,

        observaciones varchar(300) NULL,

        actor_user_id uuid NULL,
        actor_email varchar(160) NULL,
        request_id varchar(100) NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,

        CONSTRAINT pk_ag_campanias_estado_historial PRIMARY KEY (id),

        CONSTRAINT fk_ag_camp_hist_campania
          FOREIGN KEY (campania_id)
          REFERENCES public.ag_campanias(id)
          ON DELETE CASCADE,

        CONSTRAINT ck_ag_camp_hist_fechas
          CHECK (
            fecha_hasta IS NULL
            OR fecha_hasta >= fecha_desde
          )
      );
    `);

    // =========================================================
    // INDICES ag_campanias
    // =========================================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_campanias_tenant
      ON public.ag_campanias (tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_campanias_lote
      ON public.ag_campanias (lote_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_campanias_pastura
      ON public.ag_campanias (pastura_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_campanias_estado
      ON public.ag_campanias (estado_actual);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_campanias_fecha_inicio
      ON public.ag_campanias (fecha_inicio);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_campanias_fecha_cierre
      ON public.ag_campanias (fecha_cierre);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_campanias_created_at
      ON public.ag_campanias (created_at);
    `);

    // Índice parcial único:
    // un lote solo puede tener una campaña abierta por tenant
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ag_campanias_lote_open
      ON public.ag_campanias (tenant_id, lote_id)
      WHERE deleted_at IS NULL
        AND estado_actual <> 'CERRADA';
    `);

    // =========================================================
    // INDICES ag_campanias_estado_historial
    // =========================================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_camp_hist_tenant
      ON public.ag_campanias_estado_historial (tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_camp_hist_campania
      ON public.ag_campanias_estado_historial (campania_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_camp_hist_estado
      ON public.ag_campanias_estado_historial (estado);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_camp_hist_fecha_desde
      ON public.ag_campanias_estado_historial (fecha_desde);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_camp_hist_fecha_hasta
      ON public.ag_campanias_estado_historial (fecha_hasta);
    `);

    // Índice parcial único:
    // una sola fila "abierta" por campaña
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ag_camp_hist_open
      ON public.ag_campanias_estado_historial (tenant_id, campania_id)
      WHERE deleted_at IS NULL
        AND fecha_hasta IS NULL;
    `);

    // =========================================================
    // TRIGGER updated_at
    // =========================================================
    // Solo agregalo si en tu proyecto YA existe esta función global.
    // Si no existe, comentá este bloque o adaptalo a tu mecanismo actual.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_proc
          WHERE proname = 'set_updated_at'
        ) THEN
          DROP TRIGGER IF EXISTS trg_ag_campanias_updated_at ON public.ag_campanias;
          CREATE TRIGGER trg_ag_campanias_updated_at
          BEFORE UPDATE ON public.ag_campanias
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at();

          DROP TRIGGER IF EXISTS trg_ag_camp_hist_updated_at ON public.ag_campanias_estado_historial;
          CREATE TRIGGER trg_ag_camp_hist_updated_at
          BEFORE UPDATE ON public.ag_campanias_estado_historial
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at();
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_ag_camp_hist_updated_at ON public.ag_campanias_estado_historial;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_ag_campanias_updated_at ON public.ag_campanias;
    `);

    // índices historial
    await queryRunner.query(`
      DROP INDEX IF EXISTS public.uq_ag_camp_hist_open;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_camp_hist_fecha_hasta;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_camp_hist_fecha_desde;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_camp_hist_estado;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_camp_hist_campania;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_camp_hist_tenant;
    `);

    // índices campanias
    await queryRunner.query(`
      DROP INDEX IF EXISTS public.uq_ag_campanias_lote_open;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_campanias_created_at;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_campanias_fecha_cierre;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_campanias_fecha_inicio;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_campanias_estado;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_campanias_pastura;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_campanias_lote;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ix_campanias_tenant;
    `);

    // tablas
    await queryRunner.query(`
      DROP TABLE IF EXISTS public.ag_campanias_estado_historial;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS public.ag_campanias;
    `);

    // enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'ag_campanias_estado_actual_enum'
        ) THEN
          DROP TYPE public.ag_campanias_estado_actual_enum;
        END IF;
      END
      $$;
    `);
  }
}
