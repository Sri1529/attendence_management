import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLeaveRecordIdToAttendance1788200000000 implements MigrationInterface {
    name = 'AddLeaveRecordIdToAttendance1788200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance" ADD "leave_record_id" uuid`);
        await queryRunner.query(`ALTER TABLE "attendance" ADD CONSTRAINT "FK_attendance_leave_record" FOREIGN KEY ("leave_record_id") REFERENCES "leave_records"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE INDEX "IDX_attendance_leave_record_id" ON "attendance" ("leave_record_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_attendance_leave_record_id"`);
        await queryRunner.query(`ALTER TABLE "attendance" DROP CONSTRAINT "FK_attendance_leave_record"`);
        await queryRunner.query(`ALTER TABLE "attendance" DROP COLUMN "leave_record_id"`);
    }
}
