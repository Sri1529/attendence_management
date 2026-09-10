import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCompaniesTable1788102908797 implements MigrationInterface {
    name = 'CreateCompaniesTable1788102908797'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."companies_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "email" character varying(255), "phone" character varying(50), "address" text, "timezone" character varying(50) NOT NULL DEFAULT 'UTC', "currency" character varying(10) NOT NULL DEFAULT 'USD', "status" "public"."companies_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "companies"`);
        await queryRunner.query(`DROP TYPE "public"."companies_status_enum"`);
    }

}
