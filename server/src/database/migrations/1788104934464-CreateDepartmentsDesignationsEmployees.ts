import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDepartmentsDesignationsEmployees1788104934464 implements MigrationInterface {
    name = 'CreateDepartmentsDesignationsEmployees1788104934464'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."departments_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "departments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "description" text, "status" "public"."departments_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_924267c09f9e6d7d8302173d41e" UNIQUE ("company_id", "name"), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."designations_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "designations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "description" text, "status" "public"."designations_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_7d8e54f07bc9e4cac8a0ea66e21" UNIQUE ("company_id", "name"), CONSTRAINT "PK_a0f024b99b1491a03fc421858ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."employees_employment_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'ON_NOTICE', 'TERMINATED')`);
        await queryRunner.query(`CREATE TABLE "employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "employee_code" character varying(50) NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "email" character varying(255), "phone" character varying(50), "joining_date" date NOT NULL, "department_id" uuid, "designation_id" uuid, "employment_status" "public"."employees_employment_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_0fa9deb997ce66924916b89e9b9" UNIQUE ("company_id", "employee_code"), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "FK_541e3d07c93baa9cc42b149a5fb" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "designations" ADD CONSTRAINT "FK_afa94101357165af73943deb8f3" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_7f3eeef59eece4147effe7bfa6a" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_678a3540f843823784b0fe4a4f2" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_2de5d6e4fb3345f18bc467017f0" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);

        const phase3Permissions = [
            ['DEPARTMENT_VIEW', 'View Departments', 'View company departments'],
            ['DEPARTMENT_CREATE', 'Create Department', 'Create new company department'],
            ['DEPARTMENT_UPDATE', 'Update Department', 'Update company department'],
            ['DEPARTMENT_DELETE', 'Delete Department', 'Delete company department'],
            ['DESIGNATION_VIEW', 'View Designations', 'View company designations'],
            ['DESIGNATION_CREATE', 'Create Designation', 'Create new company designation'],
            ['DESIGNATION_UPDATE', 'Update Designation', 'Update company designation'],
            ['DESIGNATION_DELETE', 'Delete Designation', 'Delete company designation']
        ];

        for (const [code, name, description] of phase3Permissions) {
            await queryRunner.query(
                `INSERT INTO "permissions" ("code", "name", "description") VALUES ($1, $2, $3) ON CONFLICT ("code") DO NOTHING`,
                [code, name, description]
            );
        }

        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r.id, p.id
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE r."is_system" = true
              AND p."code" IN ('DEPARTMENT_VIEW', 'DEPARTMENT_CREATE', 'DEPARTMENT_UPDATE', 'DEPARTMENT_DELETE', 'DESIGNATION_VIEW', 'DESIGNATION_CREATE', 'DESIGNATION_UPDATE', 'DESIGNATION_DELETE')
            ON CONFLICT ("role_id", "permission_id") DO NOTHING;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_2de5d6e4fb3345f18bc467017f0"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_678a3540f843823784b0fe4a4f2"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_7f3eeef59eece4147effe7bfa6a"`);
        await queryRunner.query(`ALTER TABLE "designations" DROP CONSTRAINT "FK_afa94101357165af73943deb8f3"`);
        await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT "FK_541e3d07c93baa9cc42b149a5fb"`);
        await queryRunner.query(`DROP TABLE "employees"`);
        await queryRunner.query(`DROP TYPE "public"."employees_employment_status_enum"`);
        await queryRunner.query(`DROP TABLE "designations"`);
        await queryRunner.query(`DROP TYPE "public"."designations_status_enum"`);
        await queryRunner.query(`DROP TABLE "departments"`);
        await queryRunner.query(`DROP TYPE "public"."departments_status_enum"`);
    }

}
