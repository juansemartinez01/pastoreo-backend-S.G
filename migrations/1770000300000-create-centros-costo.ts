// src/common/database/migrations/1770000300000-create-centros-costo.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCentrosCosto1770000300000 implements MigrationInterface {
  name = 'CreateCentrosCosto1770000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cat_nombre_centro_costo') THEN
          CREATE TYPE cat_nombre_centro_costo AS ENUM ('AGRICULTURA', 'GANADERIA');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cat_centros_costo (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        nombre cat_nombre_centro_costo NOT NULL,
        descripcion varchar(200) NULL,
        activo boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_centros_costo_tenant
      ON cat_centros_costo (tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_centros_costo_nombre
      ON cat_centros_costo (nombre);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_centros_costo_activo
      ON cat_centros_costo (activo);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_centros_costo_tenant_nombre
      ON cat_centros_costo (tenant_id, nombre)
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS ux_centros_costo_tenant_nombre;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS ix_centros_costo_activo;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_centros_costo_nombre;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_centros_costo_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cat_centros_costo;`);
    await queryRunner.query(`DROP TYPE IF EXISTS cat_nombre_centro_costo;`);
  }
}
