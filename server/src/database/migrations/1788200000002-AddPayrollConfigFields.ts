import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPayrollConfigFields1788200000002 implements MigrationInterface {
    name = 'AddPayrollConfigFields1788200000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "companies" ADD "absence_deduction_mode" varchar(20) NOT NULL DEFAULT 'AUTOMATIC'`);
        await queryRunner.query(`ALTER TABLE "leave_types" ADD "is_paid" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "leave_records" ADD "is_paid" boolean`);
        await queryRunner.query(`ALTER TABLE "payroll_records" ADD "paid_leave_days" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "payroll_records" ADD "unpaid_leave_days" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "payroll_records" ADD "unpaid_leave_deduction" numeric(12,2) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "payroll_records" ADD "absence_deduction_mode" varchar(20) NOT NULL DEFAULT 'AUTOMATIC'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payroll_records" DROP COLUMN "absence_deduction_mode"`);
        await queryRunner.query(`ALTER TABLE "payroll_records" DROP COLUMN "unpaid_leave_deduction"`);
        await queryRunner.query(`ALTER TABLE "payroll_records" DROP COLUMN "unpaid_leave_days"`);
        await queryRunner.query(`ALTER TABLE "payroll_records" DROP COLUMN "paid_leave_days"`);
        await queryRunner.query(`ALTER TABLE "leave_records" DROP COLUMN "is_paid"`);
        await queryRunner.query(`ALTER TABLE "leave_types" DROP COLUMN "is_paid"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "absence_deduction_mode"`);
    }
}
