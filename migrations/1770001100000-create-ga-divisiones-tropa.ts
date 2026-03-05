// src/common/database/migrations/1770001100000-create-ga-divisiones-tropa.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGaDivisionesTropa1770001100000 implements MigrationInterface {
  name = 'CreateGaDivisionesTropa1770001100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ga_divisiones_tropa (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        tropa_origen_id uuid NOT NULL,
        tropa_destino_id uuid NOT NULL,

        fecha date NOT NULL,

        cabezas_transferidas int NOT NULL,
        peso_prom_destino numeric(14,4) NOT NULL,

        peso_prom_origen_anterior numeric(14,4) NOT NULL,
        peso_prom_origen_nuevo numeric(14,4) NULL,

        notas varchar(300) NULL,
        destino_creado boolean NOT NULL DEFAULT true,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,

        CONSTRAINT ck_div_cabezas_pos CHECK (cabezas_transferidas >= 1)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE ga_divisiones_tropa
      ADD CONSTRAINT fk_div_origen
      FOREIGN KEY (tropa_origen_id) REFERENCES ga_tropas(id)
      ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      ALTER TABLE ga_divisiones_tropa
      ADD CONSTRAINT fk_div_destino
      FOREIGN KEY (tropa_destino_id) REFERENCES ga_tropas(id)
      ON DELETE RESTRICT;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_div_tenant ON ga_divisiones_tropa (tenant_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_div_fecha ON ga_divisiones_tropa (fecha);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_div_origen ON ga_divisiones_tropa (tropa_origen_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_div_destino ON ga_divisiones_tropa (tropa_destino_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_div_origen_fecha ON ga_divisiones_tropa (tropa_origen_id, fecha);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ga_divisiones_tropa DROP CONSTRAINT IF EXISTS fk_div_destino;`,
    );
    await queryRunner.query(
      `ALTER TABLE ga_divisiones_tropa DROP CONSTRAINT IF EXISTS fk_div_origen;`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS ix_div_origen_fecha;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_div_destino;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_div_origen;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_div_fecha;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_div_tenant;`);

    await queryRunner.query(`DROP TABLE IF EXISTS ga_divisiones_tropa;`);
  }
}
