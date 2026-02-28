import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1760000000000 implements MigrationInterface {
  name = 'InitSchema1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "app_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "key" character varying(80) NOT NULL, "value" text NOT NULL, CONSTRAINT "PK_4800b266ba790931744b3e53a74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fac6d1d8404e15367bb6f92f14" ON "app_settings" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_975c2db59c65c05fd9c6b63a2a" ON "app_settings" ("key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(40) NOT NULL, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e59a01f4fe46ebbece575d9a0f" ON "roles" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "token_hash" character varying(120) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a8595644958acb2c80e175778" ON "refresh_tokens" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_tenant_user_revoked" ON "refresh_tokens" ("tenant_id", "user_id", "revoked_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "email" character varying(150) NOT NULL, "password_hash" character varying(120) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_109638590074998bb72a2f2cf0" ON "users" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_tenant_email" ON "users" ("tenant_id", "email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cat_pasturas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "nombre" character varying(120) NOT NULL, "descripcion" character varying(300), "precio_kg_ars" numeric(14,4) NOT NULL DEFAULT '0', "precio_kg_usd" numeric(14,4) NOT NULL DEFAULT '0', "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a83316a29ae150f86d91fb0ace6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ff4974dd2360cf5184d25c62c6" ON "cat_pasturas" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_pasturas_activo" ON "cat_pasturas" ("activo") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_pasturas_nombre" ON "cat_pasturas" ("nombre") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cat_pastura_precio_audit" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "pastura_id" uuid NOT NULL, "changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "precio_ars_anterior" numeric(14,4) NOT NULL, "precio_ars_nuevo" numeric(14,4) NOT NULL, "precio_usd_anterior" numeric(14,4) NOT NULL, "precio_usd_nuevo" numeric(14,4) NOT NULL, "actor_user_id" uuid, "actor_email" character varying(200), "request_id" character varying(80), CONSTRAINT "PK_2e3ad2acec708bae21df63e88cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_818af31069530ba13a6431a341" ON "cat_pastura_precio_audit" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_pastura_audit_changed_at" ON "cat_pastura_precio_audit" ("changed_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_pastura_audit_pastura" ON "cat_pastura_precio_audit" ("pastura_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "kind" character varying(50) NOT NULL, "request_id" character varying(60) NOT NULL, "method" character varying(10), "path" character varying(300), "status_code" integer, "action" character varying(80), "entity" character varying(60), "target_user_id" uuid, "target_role_id" uuid, "actor_user_id" uuid, "actor_email" character varying(150), "payload" jsonb, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f18d459490bb48923b1f40bdb" ON "audit_logs" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_760923c0f409cdaef37c0a173e" ON "audit_logs" ("kind") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_959054ba1c3ad6190ce3f7c754" ON "audit_logs" ("request_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f160d97a931844109de9d04228" ON "audit_logs" ("actor_user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_roles" ("user_id" uuid NOT NULL, "role_id" uuid NOT NULL, CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY ("user_id", "role_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cat_pastura_precio_audit" ADD CONSTRAINT "FK_6a9c4791da4d0c7f5640298f198" FOREIGN KEY ("pastura_id") REFERENCES "cat_pasturas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_b23c65e50a758245a33ee35fda1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_87b8888186ca9769c960e926870"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cat_pastura_precio_audit" DROP CONSTRAINT "FK_6a9c4791da4d0c7f5640298f198"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b23c65e50a758245a33ee35fda"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_87b8888186ca9769c960e92687"`,
    );
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f160d97a931844109de9d04228"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_959054ba1c3ad6190ce3f7c754"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_760923c0f409cdaef37c0a173e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6f18d459490bb48923b1f40bdb"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP INDEX "public"."ix_pastura_audit_pastura"`);
    await queryRunner.query(
      `DROP INDEX "public"."ix_pastura_audit_changed_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_818af31069530ba13a6431a341"`,
    );
    await queryRunner.query(`DROP TABLE "cat_pastura_precio_audit"`);
    await queryRunner.query(`DROP INDEX "public"."ix_pasturas_nombre"`);
    await queryRunner.query(`DROP INDEX "public"."ix_pasturas_activo"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ff4974dd2360cf5184d25c62c6"`,
    );
    await queryRunner.query(`DROP TABLE "cat_pasturas"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_users_tenant_email"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_109638590074998bb72a2f2cf0"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_refresh_tokens_tenant_user_revoked"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5a8595644958acb2c80e175778"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e59a01f4fe46ebbece575d9a0f"`,
    );
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_975c2db59c65c05fd9c6b63a2a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fac6d1d8404e15367bb6f92f14"`,
    );
    await queryRunner.query(`DROP TABLE "app_settings"`);
  }
}
