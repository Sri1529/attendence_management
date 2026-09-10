import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionTables1788108139955 implements MigrationInterface {
  name = 'CreateSubscriptionTables1788108139955';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."subscription_plans_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "description" text, "price_monthly" numeric(12,2) NOT NULL DEFAULT '0', "price_yearly" numeric(12,2) NOT NULL DEFAULT '0', "trial_days" integer NOT NULL DEFAULT '14', "status" "public"."subscription_plans_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2d2df70a81d37c893ef216caf8a" UNIQUE ("code"), CONSTRAINT "PK_9ab8fe6918451ab3d0a4fb6bb0c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "plan_id" uuid NOT NULL, "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'TRIAL', "trial_start_at" TIMESTAMP WITH TIME ZONE, "trial_end_at" TIMESTAMP WITH TIME ZONE, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "current_period_start" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "current_period_end" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "cancelled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_383e5a6ce208cdeae91dcdf83c" ON "subscriptions" ("current_period_end")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d53c41a65dce416db2e1028a01" ON "subscriptions" ("trial_end_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_739c5c0676bb098bab42bcbed7" ON "subscriptions" ("company_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e3cc01c420db5151aa2136035" ON "subscriptions" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_active_company_subscription" ON "subscriptions" ("company_id") WHERE status IN ('TRIAL', 'ACTIVE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_7e3cc01c420db5151aa21360358" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Seed initial subscription plans
    await queryRunner.query(
      `INSERT INTO "subscription_plans" ("code", "name", "description", "price_monthly", "price_yearly", "trial_days", "status")
       VALUES
         ('FREE', 'Free Plan', 'Basic trial plan with 14 days free access', 0.00, 0.00, 14, 'ACTIVE'),
         ('MONTHLY', 'Monthly Plan', 'Full feature plan billed monthly', 49.00, 490.00, 14, 'ACTIVE'),
         ('YEARLY', 'Yearly Plan', 'Full feature plan billed yearly with discount', 49.00, 490.00, 14, 'ACTIVE')
       ON CONFLICT ("code") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_7e3cc01c420db5151aa21360358"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_active_company_subscription"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7e3cc01c420db5151aa2136035"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_739c5c0676bb098bab42bcbed7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d53c41a65dce416db2e1028a01"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_383e5a6ce208cdeae91dcdf83c"`,
    );
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
    await queryRunner.query(`DROP TABLE "subscription_plans"`);
    await queryRunner.query(
      `DROP TYPE "public"."subscription_plans_status_enum"`,
    );
  }
}
