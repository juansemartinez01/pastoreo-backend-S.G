// src/common/database/migrations/1770000200000-create-proveedores.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProveedores1770000200000 implements MigrationInterface {
  name = 'CreateProveedores1770000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prov_tipo_proveedor') THEN
          CREATE TYPE prov_tipo_proveedor AS ENUM (
            'INSUMO',
            'SERVICIO',
            'TRANSPORTE',
            'OTRO'
          );
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prov_proveedores (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        nombre varchar(160) NOT NULL,
        cuit varchar(20) NULL,
        tipo prov_tipo_proveedor NOT NULL DEFAULT 'OTRO',
        telefono varchar(40) NULL,
        email varchar(120) NULL,
        notas varchar(300) NULL,
        activo boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    // Índices
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_proveedores_tenant
      ON prov_proveedores (tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_proveedores_nombre
      ON prov_proveedores (nombre);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_proveedores_activo
      ON prov_proveedores (activo);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_proveedores_cuit
      ON prov_proveedores (cuit);
    `);

    // ✅ Unique nombre por tenant (solo activos, ignora soft delete)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_proveedores_tenant_nombre
      ON prov_proveedores (tenant_id, nombre)
      WHERE deleted_at IS NULL;
    `);

    // ✅ Unique CUIT por tenant (solo cuando cuit != null, ignora soft delete)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_proveedores_tenant_cuit
      ON prov_proveedores (tenant_id, cuit)
      WHERE cuit IS NOT NULL AND deleted_at IS NULL;
    `);

    // (Opcional) CHECK para asegurar solo dígitos cuando no sea null.
    // Lo dejo activado porque vos pediste normalizado sí o sí.
    await queryRunner.query(`
      ALTER TABLE prov_proveedores
      ADD CONSTRAINT chk_proveedores_cuit_digits
      CHECK (cuit IS NULL OR cuit ~ '^[0-9]+$');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE prov_proveedores DROP CONSTRAINT IF EXISTS chk_proveedores_cuit_digits;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS ux_proveedores_tenant_cuit;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS ux_proveedores_tenant_nombre;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS ix_proveedores_cuit;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_proveedores_activo;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_proveedores_nombre;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_proveedores_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS prov_proveedores;`);
    await queryRunner.query(`DROP TYPE IF EXISTS prov_tipo_proveedor;`);
  }
}
