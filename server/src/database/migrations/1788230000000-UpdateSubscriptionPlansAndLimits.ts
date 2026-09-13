import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSubscriptionPlansAndLimits1788230000000
  implements MigrationInterface
{
  name = 'UpdateSubscriptionPlansAndLimits1788230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "billing_interval" character varying(20) NOT NULL DEFAULT 'MONTHLY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "price" numeric(12,2) NOT NULL DEFAULT 0.00`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "currency" character varying(10) NOT NULL DEFAULT 'INR'`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "max_employees" integer NOT NULL DEFAULT 25`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "max_users" integer NOT NULL DEFAULT 5`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "features" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "display_order" integer NOT NULL DEFAULT 0`,
    );

    // Inactivate legacy plans if any
    await queryRunner.query(
      `UPDATE "subscription_plans" SET "status" = 'INACTIVE' WHERE "code" IN ('FREE', 'MONTHLY', 'YEARLY')`,
    );

    // Seed the 6 official Workora subscription plans
    await queryRunner.query(
      `INSERT INTO "subscription_plans" ("code", "name", "description", "billing_interval", "price", "currency", "max_employees", "max_users", "price_monthly", "price_yearly", "display_order", "status", "features")
       VALUES
         ('STARTER_MONTHLY', 'Starter', 'Starter monthly plan for up to 25 employees and 5 users', 'MONTHLY', 99.00, 'INR', 25, 5, 99.00, 999.00, 1, 'ACTIVE', '["Up to 25 active employees", "Up to 5 users", "Full Attendance & Leave", "Salary & Advances", "Monthly Payroll & PDF Payslips"]'::jsonb),
         ('BUSINESS_MONTHLY', 'Business', 'Business monthly plan for up to 75 employees and 15 users', 'MONTHLY', 249.00, 'INR', 75, 15, 249.00, 2499.00, 2, 'ACTIVE', '["Up to 75 active employees", "Up to 15 users", "Full Attendance & Leave", "Salary & Advances", "Monthly Payroll & PDF Payslips", "Roles & Custom Permissions"]'::jsonb),
         ('PROFESSIONAL_MONTHLY', 'Professional', 'Professional monthly plan for up to 150 employees and 30 users', 'MONTHLY', 499.00, 'INR', 150, 30, 499.00, 4999.00, 3, 'ACTIVE', '["Up to 150 active employees", "Up to 30 users", "Full Attendance & Leave", "Salary & Advances", "Monthly Payroll & PDF Payslips", "Roles & Custom Permissions", "Audit Logging"]'::jsonb),
         ('STARTER_YEARLY', 'Starter', 'Starter yearly plan for up to 25 employees and 5 users', 'YEARLY', 999.00, 'INR', 25, 5, 99.00, 999.00, 4, 'ACTIVE', '["Up to 25 active employees", "Up to 5 users", "Full Attendance & Leave", "Salary & Advances", "Monthly Payroll & PDF Payslips"]'::jsonb),
         ('BUSINESS_YEARLY', 'Business', 'Business yearly plan for up to 75 employees and 15 users', 'YEARLY', 2499.00, 'INR', 75, 15, 249.00, 2499.00, 5, 'ACTIVE', '["Up to 75 active employees", "Up to 15 users", "Full Attendance & Leave", "Salary & Advances", "Monthly Payroll & PDF Payslips", "Roles & Custom Permissions"]'::jsonb),
         ('PROFESSIONAL_YEARLY', 'Professional', 'Professional yearly plan for up to 150 employees and 30 users', 'YEARLY', 4999.00, 'INR', 150, 30, 499.00, 4999.00, 6, 'ACTIVE', '["Up to 150 active employees", "Up to 30 users", "Full Attendance & Leave", "Salary & Advances", "Monthly Payroll & PDF Payslips", "Roles & Custom Permissions", "Audit Logging"]'::jsonb)
       ON CONFLICT ("code") DO UPDATE SET
         "name" = EXCLUDED."name",
         "description" = EXCLUDED."description",
         "billing_interval" = EXCLUDED."billing_interval",
         "price" = EXCLUDED."price",
         "currency" = EXCLUDED."currency",
         "max_employees" = EXCLUDED."max_employees",
         "max_users" = EXCLUDED."max_users",
         "display_order" = EXCLUDED."display_order",
         "status" = EXCLUDED."status",
         "features" = EXCLUDED."features"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "subscription_plans" WHERE "code" IN ('STARTER_MONTHLY', 'BUSINESS_MONTHLY', 'PROFESSIONAL_MONTHLY', 'STARTER_YEARLY', 'BUSINESS_YEARLY', 'PROFESSIONAL_YEARLY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "display_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "features"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "max_users"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "max_employees"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "currency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "billing_interval"`,
    );
  }
}
