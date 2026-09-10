import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSalaryAndAdvanceTables1788105956372 implements MigrationInterface {
    name = 'CreateSalaryAndAdvanceTables1788105956372'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "employee_salary_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "basic_salary" numeric(12,2) NOT NULL, "effective_from" date NOT NULL, "effective_to" date, "notes" text, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0d0766845b70e91af5656e03d2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a9f002e47500fbdc6ef536e38e" ON "employee_salary_history"  ("company_id", "employee_id", "effective_from") `);
        await queryRunner.query(`CREATE TYPE "public"."salary_adjustments_adjustment_type_enum" AS ENUM('OVERTIME', 'BONUS', 'INCENTIVE', 'OTHER_EARNING', 'OTHER_DEDUCTION')`);
        await queryRunner.query(`CREATE TYPE "public"."salary_adjustments_status_enum" AS ENUM('ACTIVE', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "salary_adjustments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "adjustment_type" "public"."salary_adjustments_adjustment_type_enum" NOT NULL, "amount" numeric(12,2) NOT NULL, "adjustment_date" date NOT NULL, "description" text, "status" "public"."salary_adjustments_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2369e8b0561ed6dcd8ca2971bc8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ba31abbb625cb9547bce75b4fc" ON "salary_adjustments"  ("company_id", "employee_id", "adjustment_date") `);
        await queryRunner.query(`CREATE TYPE "public"."employee_advances_status_enum" AS ENUM('ACTIVE', 'SETTLED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "employee_advances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "advance_number" character varying(50) NOT NULL, "amount" numeric(12,2) NOT NULL, "advance_date" date NOT NULL, "reason" text, "status" "public"."employee_advances_status_enum" NOT NULL DEFAULT 'ACTIVE', "notes" text, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_fb08769f2cb124f8b936423e7a9" UNIQUE ("company_id", "advance_number"), CONSTRAINT "PK_67088453c94606fff3f287671a2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_34f545b9778125300bdc502399" ON "employee_advances"  ("company_id", "employee_id", "status") `);
        await queryRunner.query(`CREATE TABLE "advance_repayments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "advance_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "repayment_date" date NOT NULL, "notes" text, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6728e2ee19e46cb7d1c2ab07263" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_154c4f253a0d641371bd070b1c" ON "advance_repayments"  ("company_id", "advance_id", "repayment_date") `);
        await queryRunner.query(`ALTER TABLE "employee_salary_history" ADD CONSTRAINT "FK_1cf4c35f3488ba179dc66917b7b" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_salary_history" ADD CONSTRAINT "FK_7e48dda472a1ee8f1e216fd46df" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_salary_history" ADD CONSTRAINT "FK_194e0c57f28642f72a5a1fe22de" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "salary_adjustments" ADD CONSTRAINT "FK_f26c0771688f65657585d0f3585" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "salary_adjustments" ADD CONSTRAINT "FK_d0dc4e11dbb084f0030d101022d" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "salary_adjustments" ADD CONSTRAINT "FK_9f8b3a901966c0cbdac337e8363" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_advances" ADD CONSTRAINT "FK_965a475f19895f7a49597ecd7a6" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_advances" ADD CONSTRAINT "FK_a90096aef5ac32f28cae96ef252" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_advances" ADD CONSTRAINT "FK_5b711b98636f21cc7ee4a098ce2" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "advance_repayments" ADD CONSTRAINT "FK_5db38bf161d636318a773b47fed" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "advance_repayments" ADD CONSTRAINT "FK_2a114c36f8c56c64086bf764e26" FOREIGN KEY ("advance_id") REFERENCES "employee_advances"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "advance_repayments" ADD CONSTRAINT "FK_106661c24c1be02dbfc77f11059" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advance_repayments" DROP CONSTRAINT "FK_106661c24c1be02dbfc77f11059"`);
        await queryRunner.query(`ALTER TABLE "advance_repayments" DROP CONSTRAINT "FK_2a114c36f8c56c64086bf764e26"`);
        await queryRunner.query(`ALTER TABLE "advance_repayments" DROP CONSTRAINT "FK_5db38bf161d636318a773b47fed"`);
        await queryRunner.query(`ALTER TABLE "employee_advances" DROP CONSTRAINT "FK_5b711b98636f21cc7ee4a098ce2"`);
        await queryRunner.query(`ALTER TABLE "employee_advances" DROP CONSTRAINT "FK_a90096aef5ac32f28cae96ef252"`);
        await queryRunner.query(`ALTER TABLE "employee_advances" DROP CONSTRAINT "FK_965a475f19895f7a49597ecd7a6"`);
        await queryRunner.query(`ALTER TABLE "salary_adjustments" DROP CONSTRAINT "FK_9f8b3a901966c0cbdac337e8363"`);
        await queryRunner.query(`ALTER TABLE "salary_adjustments" DROP CONSTRAINT "FK_d0dc4e11dbb084f0030d101022d"`);
        await queryRunner.query(`ALTER TABLE "salary_adjustments" DROP CONSTRAINT "FK_f26c0771688f65657585d0f3585"`);
        await queryRunner.query(`ALTER TABLE "employee_salary_history" DROP CONSTRAINT "FK_194e0c57f28642f72a5a1fe22de"`);
        await queryRunner.query(`ALTER TABLE "employee_salary_history" DROP CONSTRAINT "FK_7e48dda472a1ee8f1e216fd46df"`);
        await queryRunner.query(`ALTER TABLE "employee_salary_history" DROP CONSTRAINT "FK_1cf4c35f3488ba179dc66917b7b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_154c4f253a0d641371bd070b1c"`);
        await queryRunner.query(`DROP TABLE "advance_repayments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_34f545b9778125300bdc502399"`);
        await queryRunner.query(`DROP TABLE "employee_advances"`);
        await queryRunner.query(`DROP TYPE "public"."employee_advances_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba31abbb625cb9547bce75b4fc"`);
        await queryRunner.query(`DROP TABLE "salary_adjustments"`);
        await queryRunner.query(`DROP TYPE "public"."salary_adjustments_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."salary_adjustments_adjustment_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a9f002e47500fbdc6ef536e38e"`);
        await queryRunner.query(`DROP TABLE "employee_salary_history"`);
    }

}
