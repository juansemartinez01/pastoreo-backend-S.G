import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantUsersEmailUnique1760000500000 implements MigrationInterface {
  name = 'TenantUsersEmailUnique1760000500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ✅ Drops seguros (no falla si no existen)
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_refresh_tokens_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_refresh_tokens_tenant_id_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_users_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_users_tenant_id_email"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_audit_logs_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_audit_logs_tenant_id_created_at"`,
    );

    // ✅ Tabla + índices seguros
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "file_objects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "owner_user_id" uuid,
        "original_name" character varying(260) NOT NULL,
        "mime" character varying(120) NOT NULL,
        "size_bytes" bigint NOT NULL,
        "bucket" character varying(120) NOT NULL,
        "key" character varying(600) NOT NULL,
        "visibility" character varying(20) NOT NULL DEFAULT 'private',
        "meta" jsonb,
        "etag" character varying(120),
        CONSTRAINT "PK_7b0aca4f7e155c5b2fad069669f" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1e1b09d809c807f6ac0ce789af" ON "file_objects" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e577c5052cb74b977fa9d11c87" ON "file_objects" ("owner_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1ed7a6bfa42de6141ad4e0ba2e" ON "file_objects" ("mime")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_786821033de5dfe12610445cd7" ON "file_objects" ("bucket")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_97640b965787cbd8503f609b8a" ON "file_objects" ("key")`,
    );

    // ✅ Si ya tenés tenant_id en init schema, esto no debe fallar
    await queryRunner.query(
      `ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "tenant_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "tenant_id" uuid`,
    );

    // ✅ Índices tenant (seguros)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fac6d1d8404e15367bb6f92f14" ON "app_settings" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e59a01f4fe46ebbece575d9a0f" ON "roles" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_5a8595644958acb2c80e175778" ON "refresh_tokens" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_109638590074998bb72a2f2cf0" ON "users" ("tenant_id")`,
    );

    // ✅ Unique final (seguro)
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_tenant_email" ON "users" ("tenant_id", "email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ✅ Down seguro también
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_users_tenant_email"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_109638590074998bb72a2f2cf0"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_5a8595644958acb2c80e175778"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_e59a01f4fe46ebbece575d9a0f"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_fac6d1d8404e15367bb6f92f14"`,
    );

    // si no existen, no explota
    await queryRunner.query(
      `ALTER TABLE "roles" DROP COLUMN IF EXISTS "tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "app_settings" DROP COLUMN IF EXISTS "tenant_id"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_97640b965787cbd8503f609b8a"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_786821033de5dfe12610445cd7"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_1ed7a6bfa42de6141ad4e0ba2e"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_e577c5052cb74b977fa9d11c87"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_1e1b09d809c807f6ac0ce789af"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "file_objects"`);

    // recreaciones (opcionales) con IF NOT EXISTS para no romper
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_logs_tenant_id_created_at" ON "audit_logs" ("created_at", "tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_logs_tenant_id" ON "audit_logs" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_tenant_id_email" ON "users" ("email", "tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_tenant_id" ON "users" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_tenant_id_user_id" ON "refresh_tokens" ("tenant_id", "user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_tenant_id" ON "refresh_tokens" ("tenant_id")`,
    );
  }
}
