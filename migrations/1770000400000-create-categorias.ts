// src/common/database/migrations/1770000400000-create-categorias.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategorias1770000400000 implements MigrationInterface {
  name = 'CreateCategorias1770000400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cat_categorias (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        centro_costo_id uuid NOT NULL,
        nombre varchar(120) NOT NULL,
        descripcion varchar(200) NULL,
        activo boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,

        CONSTRAINT fk_categoria_centro_costo
          FOREIGN KEY (centro_costo_id)
          REFERENCES cat_centros_costo(id)
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_categorias_tenant
      ON cat_categorias (tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_categorias_nombre
      ON cat_categorias (nombre);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_categorias_activo
      ON cat_categorias (activo);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_categorias_centro
      ON cat_categorias (centro_costo_id);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_categorias_tenant_centro_nombre
      ON cat_categorias (tenant_id, centro_costo_id, nombre)
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS ux_categorias_tenant_centro_nombre;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS ix_categorias_centro;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_categorias_activo;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_categorias_nombre;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_categorias_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cat_categorias;`);
  }
}
