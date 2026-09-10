import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSalaryHistoryActivePeriodUniqueIndex1788190000000 implements MigrationInterface {
    name = 'FixSalaryHistoryActivePeriodUniqueIndex1788190000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Clean up any existing duplicate open-ended salary history records per employee.
        // Keep only the record with the latest effective_from (or created_at / id) open (effective_to = NULL).
        // For earlier open records, set effective_to = (next_effective_from - 1 day).
        await queryRunner.query(`
            WITH active_records AS (
                SELECT 
                    id,
                    employee_id,
                    effective_from,
                    LEAD(effective_from) OVER (
                        PARTITION BY employee_id 
                        ORDER BY effective_from ASC, created_at ASC, id ASC
                    ) AS next_effective_from,
                    ROW_NUMBER() OVER (
                        PARTITION BY employee_id 
                        ORDER BY effective_from DESC, created_at DESC, id DESC
                    ) AS rn
                FROM "employee_salary_history"
                WHERE "effective_to" IS NULL
            )
            UPDATE "employee_salary_history" sh
            SET "effective_to" = (ar.next_effective_from - INTERVAL '1 day')::date
            FROM active_records ar
            WHERE sh.id = ar.id
              AND ar.rn > 1
              AND ar.next_effective_from IS NOT NULL;
        `);

        // 2. Enforce PostgreSQL partial unique index: only ONE record per employee can have effective_to IS NULL.
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_employee_salary_history_active_unique" ON "employee_salary_history" ("employee_id") WHERE "effective_to" IS NULL`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX "public"."UQ_employee_salary_history_active_unique"`
        );
    }
}
