import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndividualEmployeePaymentTracking1788250000000 implements MigrationInterface {
  name = 'AddIndividualEmployeePaymentTracking1788250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add PARTIALLY_PAID enum value to payroll_periods_status_enum if not present
    await queryRunner.query(
      `ALTER TYPE "public"."payroll_periods_status_enum" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID'`,
    );

    // 2. Create payroll_records_payment_status_enum
    await queryRunner.query(
      `CREATE TYPE "public"."payroll_records_payment_status_enum" AS ENUM('UNPAID', 'PAID')`,
    );

    // 3. Add payment columns to payroll_records
    await queryRunner.query(
      `ALTER TABLE "payroll_records" ADD "payment_status" "public"."payroll_records_payment_status_enum" NOT NULL DEFAULT 'UNPAID'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_records" ADD "payment_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_records" ADD "payment_method" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_records" ADD "payment_reference" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_records" ADD "paid_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_records" ADD "paid_by" uuid`,
    );

    // 4. Add foreign key constraint for paid_by -> users(id)
    await queryRunner.query(
      `ALTER TABLE "payroll_records" ADD CONSTRAINT "FK_payroll_records_paid_by" FOREIGN KEY ("paid_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // 5. Backfill historical data safely without fake dates (Phase 21)
    // For records already marked as PAID in status: set payment_status = PAID, paid_at = finalized_at
    await queryRunner.query(
      `UPDATE "payroll_records" SET "payment_status" = 'PAID', "paid_at" = COALESCE("finalized_at", "updated_at") WHERE "status" = 'PAID'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payroll_records" DROP CONSTRAINT "FK_payroll_records_paid_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_records" DROP COLUMN "paid_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_records" DROP COLUMN "paid_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_records" DROP COLUMN "payment_reference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_records" DROP COLUMN "payment_method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_records" DROP COLUMN "payment_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payroll_records" DROP COLUMN "payment_status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."payroll_records_payment_status_enum"`,
    );
  }
}
