// src/common/database/migrations/1770001000000-create-ga-eventos-muerte.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGaEventosMuerte1770001000000 implements MigrationInterface {
  name = 'CreateGaEventosMuerte1770001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ga_eventos_muerte (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,

        tropa_id uuid NOT NULL,
        fecha date NOT NULL,
        cabezas int NOT NULL,
        notas varchar(300) NULL,

        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,

        CONSTRAINT ck_ga_eventos_muerte_cabezas_pos CHECK (cabezas >= 1)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE ga_eventos_muerte
      ADD CONSTRAINT fk_ga_eventos_muerte_tropa
      FOREIGN KEY (tropa_id) REFERENCES ga_tropas(id)
      ON DELETE RESTRICT;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_muerte_tenant ON ga_eventos_muerte (tenant_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_muerte_tropa ON ga_eventos_muerte (tropa_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_muerte_fecha ON ga_eventos_muerte (fecha);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_muerte_tropa_fecha ON ga_eventos_muerte (tropa_id, fecha);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ga_eventos_muerte DROP CONSTRAINT IF EXISTS fk_ga_eventos_muerte_tropa;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS ix_muerte_tropa_fecha;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_muerte_fecha;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_muerte_tropa;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_muerte_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ga_eventos_muerte;`);
  }
}
