import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayslipAndAuditTables1788107078910 implements MigrationInterface {
  name = 'CreatePayslipAndAuditTables1788107078910';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payslips" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "payroll_record_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "payslip_number" character varying(50) NOT NULL, "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_3e5cbaf3c2899350f0abc5b36cd" UNIQUE ("company_id", "payslip_number"), CONSTRAINT "UQ_b573a8c39328826af0a6241d481" UNIQUE ("company_id", "payroll_record_id"), CONSTRAINT "PK_2b1cd07059daf60cc440c9976e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3e5cbaf3c2899350f0abc5b36c" ON "payslips" ("company_id", "payslip_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2fdaeae99c29afbf1dd94383fb" ON "payslips" ("company_id", "employee_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "user_id" uuid, "action" character varying(100) NOT NULL, "entity_type" character varying(100), "entity_id" uuid, "metadata" jsonb, "ip_address" character varying(45), "user_agent" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ee6f6bf1876924d1dc035cfb47" ON "audit_logs" ("company_id", "entity_type", "entity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5363b2a72495f9710b265a8a64" ON "audit_logs" ("company_id", "action", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_13a9f0496bbdaa2275f38d8aa6" ON "audit_logs" ("company_id", "created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "payslips" ADD CONSTRAINT "FK_3e495f04daafbdaa1047fb7f101" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payslips" ADD CONSTRAINT "FK_662d26d1045fde8fa2290d619d0" FOREIGN KEY ("payroll_record_id") REFERENCES "payroll_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payslips" ADD CONSTRAINT "FK_3ca6cde51127cd649278d038ca9" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_50d854b973295d7c51bcf346efe" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Seed PAYSLIP_CREATE permission if not exists
    await queryRunner.query(
      `INSERT INTO "permissions" ("code", "name", "description") VALUES ('PAYSLIP_CREATE', 'Create Payslip', 'Permission to generate and create payslips') ON CONFLICT ("code") DO NOTHING`,
    );

    // Assign PAYSLIP_CREATE, PAYSLIP_VIEW, PAYSLIP_DOWNLOAD, AUDIT_LOG_VIEW to all system Company Owner roles
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT r.id, p.id
       FROM "roles" r
       CROSS JOIN "permissions" p
       WHERE r.is_system = true
         AND r.name = 'Company Owner'
         AND p.code IN ('PAYSLIP_CREATE', 'PAYSLIP_VIEW', 'PAYSLIP_DOWNLOAD', 'AUDIT_LOG_VIEW')
       ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_50d854b973295d7c51bcf346efe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payslips" DROP CONSTRAINT "FK_3ca6cde51127cd649278d038ca9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payslips" DROP CONSTRAINT "FK_662d26d1045fde8fa2290d619d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payslips" DROP CONSTRAINT "FK_3e495f04daafbdaa1047fb7f101"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_13a9f0496bbdaa2275f38d8aa6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5363b2a72495f9710b265a8a64"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ee6f6bf1876924d1dc035cfb47"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2fdaeae99c29afbf1dd94383fb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3e5cbaf3c2899350f0abc5b36c"`,
    );
    await queryRunner.query(`DROP TABLE "payslips"`);
  }
}
