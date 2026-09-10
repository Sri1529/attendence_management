import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersRolesPermissions1788103631972 implements MigrationInterface {
    name = 'CreateUsersRolesPermissions1788103631972'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."roles_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "description" text, "is_system" boolean NOT NULL DEFAULT false, "status" "public"."roles_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9acb61b0b5c438c8c68f6eb91a1" UNIQUE ("company_id", "name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "role_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE', "refresh_token_hash" character varying(255), "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(100) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role_id" uuid NOT NULL, "permission_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_25d24010f53bb80b78e412c9656" UNIQUE ("role_id", "permission_id"), CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_4bc1204a05dde26383e3955b0a1" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_7ae6334059289559722437bcc1c" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        const systemPermissions = [
            ['EMPLOYEE_VIEW', 'View Employees', 'View employee profiles and details'],
            ['EMPLOYEE_CREATE', 'Create Employee', 'Create new employee profiles'],
            ['EMPLOYEE_UPDATE', 'Update Employee', 'Update existing employee details'],
            ['EMPLOYEE_DELETE', 'Delete Employee', 'Delete employee profiles'],
            ['ATTENDANCE_VIEW', 'View Attendance', 'View employee attendance records'],
            ['ATTENDANCE_CREATE', 'Create Attendance', 'Record attendance entries'],
            ['ATTENDANCE_UPDATE', 'Update Attendance', 'Modify attendance entries'],
            ['ATTENDANCE_DELETE', 'Delete Attendance', 'Remove attendance entries'],
            ['LEAVE_VIEW', 'View Leave', 'View leave requests and balances'],
            ['LEAVE_CREATE', 'Create Leave', 'Submit or create leave requests'],
            ['LEAVE_UPDATE', 'Update Leave', 'Approve/reject or update leave requests'],
            ['LEAVE_DELETE', 'Delete Leave', 'Cancel or delete leave requests'],
            ['SALARY_VIEW', 'View Salary', 'View employee salary details'],
            ['SALARY_CREATE', 'Create Salary', 'Define salary structures'],
            ['SALARY_UPDATE', 'Update Salary', 'Modify salary structures'],
            ['ADVANCE_VIEW', 'View Salary Advances', 'View salary advance requests'],
            ['ADVANCE_CREATE', 'Create Salary Advance', 'Request or create salary advances'],
            ['ADVANCE_UPDATE', 'Update Salary Advance', 'Approve/modify salary advance requests'],
            ['ADVANCE_DELETE', 'Delete Salary Advance', 'Delete salary advance requests'],
            ['PAYROLL_VIEW', 'View Payroll', 'View payroll processing records'],
            ['PAYROLL_GENERATE', 'Generate Payroll', 'Generate monthly payrolls'],
            ['PAYROLL_UPDATE', 'Update Payroll', 'Modify draft payroll records'],
            ['PAYROLL_FINALIZE', 'Finalize Payroll', 'Finalize and lock payroll records'],
            ['PAYROLL_MARK_PAID', 'Mark Payroll Paid', 'Mark finalized payrolls as paid'],
            ['PAYSLIP_VIEW', 'View Payslip', 'View employee payslips'],
            ['PAYSLIP_DOWNLOAD', 'Download Payslip', 'Download payslip PDF documents'],
            ['USER_VIEW', 'View Users', 'View company users'],
            ['USER_CREATE', 'Create User', 'Create new company users'],
            ['USER_UPDATE', 'Update User', 'Update company user details'],
            ['USER_DEACTIVATE', 'Deactivate User', 'Activate/Deactivate company users'],
            ['ROLE_VIEW', 'View Roles', 'View company roles and permissions'],
            ['ROLE_CREATE', 'Create Role', 'Create new custom company roles'],
            ['ROLE_UPDATE', 'Update Role', 'Modify company roles and permissions'],
            ['ROLE_DELETE', 'Delete Role', 'Delete custom company roles'],
            ['COMPANY_SETTINGS_VIEW', 'View Company Settings', 'View company settings and configuration'],
            ['COMPANY_SETTINGS_UPDATE', 'Update Company Settings', 'Modify company settings and configuration'],
            ['SUBSCRIPTION_VIEW', 'View Subscription', 'View subscription status'],
            ['SUBSCRIPTION_MANAGE', 'Manage Subscription', 'Manage subscription plan and billing'],
            ['AUDIT_LOG_VIEW', 'View Audit Logs', 'View system audit logs']
        ];

        for (const [code, name, description] of systemPermissions) {
            await queryRunner.query(
                `INSERT INTO "permissions" ("code", "name", "description") VALUES ($1, $2, $3) ON CONFLICT ("code") DO NOTHING`,
                [code, name, description]
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_7ae6334059289559722437bcc1c"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_4bc1204a05dde26383e3955b0a1"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TYPE "public"."roles_status_enum"`);
    }

}
