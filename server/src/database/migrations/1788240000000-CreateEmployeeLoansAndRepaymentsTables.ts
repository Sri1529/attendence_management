import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEmployeeLoansAndRepaymentsTables1788240000000 implements MigrationInterface {
  name = 'CreateEmployeeLoansAndRepaymentsTables1788240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."employee_loans_status_enum" AS ENUM('ACTIVE', 'COMPLETED', 'CANCELLED')`
    );

    await queryRunner.query(`
      CREATE TABLE "employee_loans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "employee_id" uuid NOT NULL,
        "loan_number" character varying(50) NOT NULL,
        "principal_amount" numeric(12,2) NOT NULL,
        "outstanding_amount" numeric(12,2) NOT NULL,
        "loan_date" date NOT NULL,
        "start_repayment_date" date,
        "status" "public"."employee_loans_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "reason" text,
        "notes" text,
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_company_loan_number" UNIQUE ("company_id", "loan_number"),
        CONSTRAINT "PK_employee_loans" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_employee_loans_company_employee_status"
      ON "employee_loans" ("company_id", "employee_id", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "loan_repayments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "loan_id" uuid NOT NULL,
        "employee_id" uuid NOT NULL,
        "payroll_record_id" uuid,
        "repayment_amount" numeric(12,2) NOT NULL,
        "repayment_date" date NOT NULL,
        "previous_outstanding_amount" numeric(12,2) NOT NULL,
        "remaining_outstanding_amount" numeric(12,2) NOT NULL,
        "notes" text,
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_repayments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_loan_repayments_company_loan_date"
      ON "loan_repayments" ("company_id", "loan_id", "repayment_date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_loan_repayments_company_employee"
      ON "loan_repayments" ("company_id", "employee_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "employee_loans"
      ADD CONSTRAINT "FK_employee_loans_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "employee_loans"
      ADD CONSTRAINT "FK_employee_loans_employee"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "employee_loans"
      ADD CONSTRAINT "FK_employee_loans_created_by"
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "loan_repayments"
      ADD CONSTRAINT "FK_loan_repayments_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "loan_repayments"
      ADD CONSTRAINT "FK_loan_repayments_loan"
      FOREIGN KEY ("loan_id") REFERENCES "employee_loans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "loan_repayments"
      ADD CONSTRAINT "FK_loan_repayments_employee"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "loan_repayments"
      ADD CONSTRAINT "FK_loan_repayments_payroll_record"
      FOREIGN KEY ("payroll_record_id") REFERENCES "payroll_records"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "loan_repayments"
      ADD CONSTRAINT "FK_loan_repayments_created_by"
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "payroll_records"
      ADD COLUMN "loan_deduction" numeric(12,2) NOT NULL DEFAULT '0.00'
    `);

    const loanPermissions = [
      ['LOAN_VIEW', 'View Employee Loans', 'View employee loan details and repayment history'],
      ['LOAN_CREATE', 'Create Employee Loan', 'Create new employee loans'],
      ['LOAN_UPDATE', 'Update Employee Loan', 'Update existing employee loans'],
      ['LOAN_CANCEL', 'Cancel Employee Loan', 'Cancel active employee loans'],
      ['LOAN_REPAYMENT_VIEW', 'View Loan Repayments', 'View loan repayment history'],
      ['LOAN_REPAYMENT_MANAGE', 'Manage Loan Repayments', 'Process or manage loan repayments'],
    ];

    for (const [code, name, description] of loanPermissions) {
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
        AND p."code" IN (
          'LOAN_VIEW',
          'LOAN_CREATE',
          'LOAN_UPDATE',
          'LOAN_CANCEL',
          'LOAN_REPAYMENT_VIEW',
          'LOAN_REPAYMENT_MANAGE'
        )
      ON CONFLICT ("role_id", "permission_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payroll_records" DROP COLUMN "loan_deduction"`);
    await queryRunner.query(`ALTER TABLE "loan_repayments" DROP CONSTRAINT "FK_loan_repayments_created_by"`);
    await queryRunner.query(`ALTER TABLE "loan_repayments" DROP CONSTRAINT "FK_loan_repayments_payroll_record"`);
    await queryRunner.query(`ALTER TABLE "loan_repayments" DROP CONSTRAINT "FK_loan_repayments_employee"`);
    await queryRunner.query(`ALTER TABLE "loan_repayments" DROP CONSTRAINT "FK_loan_repayments_loan"`);
    await queryRunner.query(`ALTER TABLE "loan_repayments" DROP CONSTRAINT "FK_loan_repayments_company"`);
    await queryRunner.query(`ALTER TABLE "employee_loans" DROP CONSTRAINT "FK_employee_loans_created_by"`);
    await queryRunner.query(`ALTER TABLE "employee_loans" DROP CONSTRAINT "FK_employee_loans_employee"`);
    await queryRunner.query(`ALTER TABLE "employee_loans" DROP CONSTRAINT "FK_employee_loans_company"`);
    await queryRunner.query(`DROP INDEX "IDX_loan_repayments_company_employee"`);
    await queryRunner.query(`DROP INDEX "IDX_loan_repayments_company_loan_date"`);
    await queryRunner.query(`DROP TABLE "loan_repayments"`);
    await queryRunner.query(`DROP INDEX "IDX_employee_loans_company_employee_status"`);
    await queryRunner.query(`DROP TABLE "employee_loans"`);
    await queryRunner.query(`DROP TYPE "public"."employee_loans_status_enum"`);
  }
}
