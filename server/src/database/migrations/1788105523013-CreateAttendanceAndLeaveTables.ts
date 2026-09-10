import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAttendanceAndLeaveTables1788105523013 implements MigrationInterface {
    name = 'CreateAttendanceAndLeaveTables1788105523013'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."attendance_status_enum" AS ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY')`);
        await queryRunner.query(`CREATE TABLE "attendance" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "attendance_date" date NOT NULL, "status" "public"."attendance_status_enum" NOT NULL DEFAULT 'PRESENT', "remarks" text, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2b9d2710620b15105d30cebf5d9" UNIQUE ("company_id", "employee_id", "attendance_date"), CONSTRAINT "PK_ee0ffe42c1f1a01e72b725c0cb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2b9d2710620b15105d30cebf5d" ON "attendance"  ("company_id", "employee_id", "attendance_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_378f629a3304a1ec278e466f21" ON "attendance"  ("company_id", "attendance_date") `);
        await queryRunner.query(`CREATE TYPE "public"."leave_types_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "leave_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "description" text, "status" "public"."leave_types_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_842299772f4f00b65811efaa79a" UNIQUE ("company_id", "name"), CONSTRAINT "PK_359223e0755d19711813cd07394" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."leave_records_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "leave_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "leave_type_id" uuid NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "status" "public"."leave_records_status_enum" NOT NULL DEFAULT 'PENDING', "remarks" text, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ccd5bb8e2089bcccc4ca3b21429" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8a16ec3f865ad9831c56eb0d13" ON "leave_records"  ("company_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_9ca8eeb708f1c0700abe0227d4" ON "leave_records"  ("company_id", "employee_id", "start_date", "end_date") `);
        await queryRunner.query(`ALTER TABLE "attendance" ADD CONSTRAINT "FK_39644a1a10d75b6f2148eb891a5" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance" ADD CONSTRAINT "FK_2be2f615d3c20d620c6485d5463" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance" ADD CONSTRAINT "FK_0f4be9b0a951f5d7e21b9e202d6" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance" ADD CONSTRAINT "FK_5577293e1198eef8f0750378138" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_types" ADD CONSTRAINT "FK_dd27cdf2939bc23d54c5a76ffee" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_records" ADD CONSTRAINT "FK_8c8d57c33c4fdcbf461c62b6a71" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_records" ADD CONSTRAINT "FK_ec30bf042deccd2d850558d1f35" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_records" ADD CONSTRAINT "FK_4a5ddeb84770c939f0d0366f491" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_records" ADD CONSTRAINT "FK_1f3b6bcbada174740e2cd505497" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_records" ADD CONSTRAINT "FK_627566775dbf07c05c252e76c5a" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leave_records" DROP CONSTRAINT "FK_627566775dbf07c05c252e76c5a"`);
        await queryRunner.query(`ALTER TABLE "leave_records" DROP CONSTRAINT "FK_1f3b6bcbada174740e2cd505497"`);
        await queryRunner.query(`ALTER TABLE "leave_records" DROP CONSTRAINT "FK_4a5ddeb84770c939f0d0366f491"`);
        await queryRunner.query(`ALTER TABLE "leave_records" DROP CONSTRAINT "FK_ec30bf042deccd2d850558d1f35"`);
        await queryRunner.query(`ALTER TABLE "leave_records" DROP CONSTRAINT "FK_8c8d57c33c4fdcbf461c62b6a71"`);
        await queryRunner.query(`ALTER TABLE "leave_types" DROP CONSTRAINT "FK_dd27cdf2939bc23d54c5a76ffee"`);
        await queryRunner.query(`ALTER TABLE "attendance" DROP CONSTRAINT "FK_5577293e1198eef8f0750378138"`);
        await queryRunner.query(`ALTER TABLE "attendance" DROP CONSTRAINT "FK_0f4be9b0a951f5d7e21b9e202d6"`);
        await queryRunner.query(`ALTER TABLE "attendance" DROP CONSTRAINT "FK_2be2f615d3c20d620c6485d5463"`);
        await queryRunner.query(`ALTER TABLE "attendance" DROP CONSTRAINT "FK_39644a1a10d75b6f2148eb891a5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9ca8eeb708f1c0700abe0227d4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a16ec3f865ad9831c56eb0d13"`);
        await queryRunner.query(`DROP TABLE "leave_records"`);
        await queryRunner.query(`DROP TYPE "public"."leave_records_status_enum"`);
        await queryRunner.query(`DROP TABLE "leave_types"`);
        await queryRunner.query(`DROP TYPE "public"."leave_types_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_378f629a3304a1ec278e466f21"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b9d2710620b15105d30cebf5d"`);
        await queryRunner.query(`DROP TABLE "attendance"`);
        await queryRunner.query(`DROP TYPE "public"."attendance_status_enum"`);
    }

}
