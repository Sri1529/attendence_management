import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayrollCorrectionsTable1788210000000
  implements MigrationInterface
{
  name = 'CreatePayrollCorrectionsTable1788210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payroll_corrections_correction_type_enum" AS ENUM('ABSENCE_DEDUCTION_REVERSAL', 'ABSENCE_DEDUCTION_ADJUSTMENT', 'PAID_LEAVE_ADJUSTMENT', 'UNPAID_LEAVE_ADJUSTMENT', 'SALARY_ADJUSTMENT', 'ADVANCE_ADJUSTMENT', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payroll_corrections_status_enum" AS ENUM('PENDING', 'APPLIED', 'REVERSED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "payroll_corrections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "payroll_record_id" uuid NOT NULL,
        "employee_id" uuid NOT NULL,
        "correction_type" "public"."payroll_corrections_correction_type_enum" NOT NULL DEFAULT 'OTHER',
        "amount" numeric(12,2) NOT NULL,
        "reason" text NOT NULL,
        "status" "public"."payroll_corrections_status_enum" NOT NULL DEFAULT 'APPLIED',
        "created_by" uuid,
        "approved_by" uuid,
        "applied_at" TIMESTAMP WITH TIME ZONE,
        "reversed_at" TIMESTAMP WITH TIME ZONE,
        "reversal_correction_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payroll_corrections_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_payroll_corrections_company_record" ON "payroll_corrections" ("company_id", "payroll_record_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payroll_corrections_company_employee" ON "payroll_corrections" ("company_id", "employee_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "payroll_corrections" ADD CONSTRAINT "FK_payroll_corrections_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_corrections" ADD CONSTRAINT "FK_payroll_corrections_record" FOREIGN KEY ("payroll_record_id") REFERENCES "payroll_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_corrections" ADD CONSTRAINT "FK_payroll_corrections_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_corrections" ADD CONSTRAINT "FK_payroll_corrections_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_corrections" ADD CONSTRAINT "FK_payroll_corrections_approved_by" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    const correctionPermissions = [
      ['PAYROLL_CORRECTION_VIEW', 'View Payroll Corrections', 'View payroll correction breakdown and history'],
      ['PAYROLL_CORRECTION_CREATE', 'Create Payroll Correction', 'Create post-finalization payroll corrections'],
      ['PAYROLL_CORRECTION_APPLY', 'Apply Payroll Correction', 'Apply post-finalization payroll corrections'],
      ['PAYROLL_CORRECTION_REVERSE', 'Reverse Payroll Correction', 'Reverse applied payroll corrections with compensating transactions'],
    ];

    for (const [code, name, description] of correctionPermissions) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("code", "name", "description") VALUES ($1, $2, $3) ON CONFLICT ("code") DO NOTHING`,
        [code, name, description],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payroll_corrections" DROP CONSTRAINT "FK_payroll_corrections_approved_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_corrections" DROP CONSTRAINT "FK_payroll_corrections_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_corrections" DROP CONSTRAINT "FK_payroll_corrections_employee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_corrections" DROP CONSTRAINT "FK_payroll_corrections_record"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_corrections" DROP CONSTRAINT "FK_payroll_corrections_company"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_payroll_corrections_company_employee"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payroll_corrections_company_record"`,
    );

    await queryRunner.query(`DROP TABLE "payroll_corrections"`);
    await queryRunner.query(
      `DROP TYPE "public"."payroll_corrections_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."payroll_corrections_correction_type_enum"`,
    );
  }
}
