import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePayrollTables1788106539948 implements MigrationInterface {
    name = 'CreatePayrollTables1788106539948'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payroll_periods_status_enum" AS ENUM('DRAFT', 'FINALIZED', 'PAID', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "payroll_periods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "period_year" integer NOT NULL, "period_month" integer NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "status" "public"."payroll_periods_status_enum" NOT NULL DEFAULT 'DRAFT', "created_by" uuid, "finalized_at" TIMESTAMP WITH TIME ZONE, "paid_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_3245b2cb4b4a94610fdb34c9325" UNIQUE ("company_id", "period_year", "period_month"), CONSTRAINT "PK_2afd9a853dd55d80ef644b74358" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4aa43c729e7c331f253e142dcd" ON "payroll_periods"  ("company_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_3245b2cb4b4a94610fdb34c932" ON "payroll_periods"  ("company_id", "period_year", "period_month") `);
        await queryRunner.query(`CREATE TYPE "public"."payroll_records_status_enum" AS ENUM('DRAFT', 'FINALIZED', 'PAID')`);
        await queryRunner.query(`CREATE TABLE "payroll_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "payroll_period_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "basic_salary" numeric(12,2) NOT NULL, "working_days" integer NOT NULL DEFAULT '0', "present_days" integer NOT NULL DEFAULT '0', "absent_days" integer NOT NULL DEFAULT '0', "half_days" integer NOT NULL DEFAULT '0', "leave_days" integer NOT NULL DEFAULT '0', "holiday_days" integer NOT NULL DEFAULT '0', "overtime_amount" numeric(12,2) NOT NULL DEFAULT '0', "bonus_amount" numeric(12,2) NOT NULL DEFAULT '0', "incentive_amount" numeric(12,2) NOT NULL DEFAULT '0', "other_earnings" numeric(12,2) NOT NULL DEFAULT '0', "absence_deduction" numeric(12,2) NOT NULL DEFAULT '0', "other_deductions" numeric(12,2) NOT NULL DEFAULT '0', "advance_deduction" numeric(12,2) NOT NULL DEFAULT '0', "gross_salary" numeric(12,2) NOT NULL, "total_deductions" numeric(12,2) NOT NULL, "net_salary" numeric(12,2) NOT NULL, "calculated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "finalized_at" TIMESTAMP WITH TIME ZONE, "status" "public"."payroll_records_status_enum" NOT NULL DEFAULT 'DRAFT', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_d4b4be0896f20404c74e6681805" UNIQUE ("company_id", "payroll_period_id", "employee_id"), CONSTRAINT "PK_869cabe268deb5726e742f2d3f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_442a76e1a69a9f21415e805de7" ON "payroll_records"  ("company_id", "employee_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1a7222dc4f59e33f89f519c4c1" ON "payroll_records"  ("company_id", "payroll_period_id") `);
        await queryRunner.query(`ALTER TABLE "advance_repayments" ADD "payroll_record_id" uuid`);
        await queryRunner.query(`ALTER TABLE "payroll_periods" ADD CONSTRAINT "FK_6781b8642c8c73abc81ee229254" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payroll_periods" ADD CONSTRAINT "FK_7e5a4352223a4e749d16c520849" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payroll_records" ADD CONSTRAINT "FK_f517d2c5ca0bc4e4f87858b8b2e" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payroll_records" ADD CONSTRAINT "FK_c1b746fda54e11b01ca2e52aaab" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payroll_records" ADD CONSTRAINT "FK_ecf7648dbd87669698c31222cae" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "advance_repayments" ADD CONSTRAINT "FK_4b4d0e11de12cedf3e14efdb030" FOREIGN KEY ("payroll_record_id") REFERENCES "payroll_records"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advance_repayments" DROP CONSTRAINT "FK_4b4d0e11de12cedf3e14efdb030"`);
        await queryRunner.query(`ALTER TABLE "payroll_records" DROP CONSTRAINT "FK_ecf7648dbd87669698c31222cae"`);
        await queryRunner.query(`ALTER TABLE "payroll_records" DROP CONSTRAINT "FK_c1b746fda54e11b01ca2e52aaab"`);
        await queryRunner.query(`ALTER TABLE "payroll_records" DROP CONSTRAINT "FK_f517d2c5ca0bc4e4f87858b8b2e"`);
        await queryRunner.query(`ALTER TABLE "payroll_periods" DROP CONSTRAINT "FK_7e5a4352223a4e749d16c520849"`);
        await queryRunner.query(`ALTER TABLE "payroll_periods" DROP CONSTRAINT "FK_6781b8642c8c73abc81ee229254"`);
        await queryRunner.query(`ALTER TABLE "advance_repayments" DROP COLUMN "payroll_record_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1a7222dc4f59e33f89f519c4c1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_442a76e1a69a9f21415e805de7"`);
        await queryRunner.query(`DROP TABLE "payroll_records"`);
        await queryRunner.query(`DROP TYPE "public"."payroll_records_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3245b2cb4b4a94610fdb34c932"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4aa43c729e7c331f253e142dcd"`);
        await queryRunner.query(`DROP TABLE "payroll_periods"`);
        await queryRunner.query(`DROP TYPE "public"."payroll_periods_status_enum"`);
    }

}
