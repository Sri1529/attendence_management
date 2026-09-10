import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillAttendanceLeaveRecordId1788200000001 implements MigrationInterface {
    name = 'BackfillAttendanceLeaveRecordId1788200000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "attendance"
            SET "leave_record_id" = lr."id"
            FROM "leave_records" lr
            WHERE "attendance"."company_id" = lr."company_id"
              AND "attendance"."employee_id" = lr."employee_id"
              AND lr."status" = 'APPROVED'
              AND "attendance"."attendance_date" >= lr."start_date"
              AND "attendance"."attendance_date" <= lr."end_date"
              AND "attendance"."leave_record_id" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No-op for backfill migration
    }
}
