import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTables1788108563446 implements MigrationInterface {
  name = 'CreatePaymentTables1788108563446';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payment_transactions_billing_interval_enum" AS ENUM('MONTHLY', 'YEARLY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_transactions_status_enum" AS ENUM('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "subscription_id" uuid, "plan_id" uuid NOT NULL, "user_id" uuid, "razorpay_order_id" character varying(100) NOT NULL, "razorpay_payment_id" character varying(100), "razorpay_signature" text, "amount" numeric(12,2) NOT NULL, "currency" character varying(10) NOT NULL DEFAULT 'INR', "billing_interval" "public"."payment_transactions_billing_interval_enum" NOT NULL DEFAULT 'MONTHLY', "status" "public"."payment_transactions_status_enum" NOT NULL DEFAULT 'CREATED', "payment_method" character varying(50), "failure_reason" text, "paid_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_99d0baf43e606e07ab0992ead49" UNIQUE ("razorpay_payment_id"), CONSTRAINT "UQ_f43fbb4c0821f3a0e81e2c0c9b0" UNIQUE ("razorpay_order_id"), CONSTRAINT "PK_d32b3c6b0d2c1d22604cbcc8c49" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_196e29cc77f7dff57f4e26c0a3" ON "payment_transactions" ("company_id", "subscription_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8523769b91beff444f9cdf0220" ON "payment_transactions" ("company_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_281ef80b8692bc455a0ef3dca5" ON "payment_transactions" ("company_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_webhook_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_id" character varying(100) NOT NULL, "event_type" character varying(100) NOT NULL, "payload" jsonb, "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_41e1ecd75f1b02632700c536edb" UNIQUE ("event_id"), CONSTRAINT "PK_750875e71d97974be92cee813ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_c37870f6c86ba2d2e4f7bee21c2" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_0baa911093b1629654e143b0923" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_2c4abef218e0e4914103c81c69f" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_77fab0556decc83a81a5bf8c25d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" DROP CONSTRAINT "FK_77fab0556decc83a81a5bf8c25d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" DROP CONSTRAINT "FK_2c4abef218e0e4914103c81c69f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" DROP CONSTRAINT "FK_0baa911093b1629654e143b0923"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" DROP CONSTRAINT "FK_c37870f6c86ba2d2e4f7bee21c2"`,
    );
    await queryRunner.query(`DROP TABLE "payment_webhook_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_281ef80b8692bc455a0ef3dca5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8523769b91beff444f9cdf0220"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_196e29cc77f7dff57f4e26c0a3"`,
    );
    await queryRunner.query(`DROP TABLE "payment_transactions"`);
    await queryRunner.query(`DROP TYPE "public"."payment_transactions_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."payment_transactions_billing_interval_enum"`,
    );
  }
}
