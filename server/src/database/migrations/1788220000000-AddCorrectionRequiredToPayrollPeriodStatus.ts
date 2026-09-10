import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCorrectionRequiredToPayrollPeriodStatus1788220000000 implements MigrationInterface {
    name = 'AddCorrectionRequiredToPayrollPeriodStatus1788220000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add CORRECTION_REQUIRED enum value to payroll_periods_status_enum
        await queryRunner.query(
            `ALTER TYPE "public"."payroll_periods_status_enum" ADD VALUE IF NOT EXISTS 'CORRECTION_REQUIRED'`
        );

        // Insert PAYROLL_REOPEN_FOR_CORRECTION permission
        await queryRunner.query(
            `INSERT INTO "permissions" ("code", "name", "description") VALUES ($1, $2, $3) ON CONFLICT ("code") DO NOTHING`,
            [
                'PAYROLL_REOPEN_FOR_CORRECTION',
                'Reopen Payroll for Correction',
                'Reopen a finalized payroll period for recalculation and correction',
            ]
        );

        // Assign permission to roles that currently have PAYROLL_FINALIZE or PAYROLL_GENERATE
        await queryRunner.query(
            `INSERT INTO "role_permissions" ("role_id", "permission_id")
             SELECT DISTINCT rp."role_id", p_new."id"
             FROM "role_permissions" rp
             JOIN "permissions" p_existing ON rp."permission_id" = p_existing."id"
             JOIN "permissions" p_new ON p_new."code" = 'PAYROLL_REOPEN_FOR_CORRECTION'
             WHERE p_existing."code" IN ('PAYROLL_FINALIZE', 'PAYROLL_GENERATE')
             ON CONFLICT ("role_id", "permission_id") DO NOTHING`
        );
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL does not easily support removing enum values in down migrations.
    }
}
