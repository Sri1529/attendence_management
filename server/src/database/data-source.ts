import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Company } from '../companies/entities/company.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { Permission } from '../permissions/entities/permission.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { Department } from '../departments/entities/department.entity.js';
import { Designation } from '../designations/entities/designation.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Attendance } from '../attendance/entities/attendance.entity.js';
import { LeaveType } from '../leave-types/entities/leave-type.entity.js';
import { LeaveRecord } from '../leave-records/entities/leave-record.entity.js';
import { EmployeeSalaryHistory } from '../salary/entities/employee-salary-history.entity.js';
import { SalaryAdjustment } from '../salary/entities/salary-adjustment.entity.js';
import { EmployeeAdvance } from '../advances/entities/employee-advance.entity.js';
import { AdvanceRepayment } from '../advances/entities/advance-repayment.entity.js';
import { PayrollPeriod } from '../payroll/entities/payroll-period.entity.js';
import { PayrollRecord } from '../payroll/entities/payroll-record.entity.js';
import { PayrollCorrection } from '../payroll/entities/payroll-correction.entity.js';
import { Payslip } from '../payslips/entities/payslip.entity.js';
import { AuditLog } from '../audit-logs/entities/audit-log.entity.js';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity.js';
import { Subscription } from '../subscriptions/entities/subscription.entity.js';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity.js';
import { PaymentWebhookEvent } from '../payments/entities/payment-webhook-event.entity.js';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';
const dbName = isTest
  ? process.env.DATABASE_TEST_NAME || 'attendence_management_test'
  : process.env.DATABASE_NAME || 'attendence_management';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'srihari',
  password: process.env.DATABASE_PASSWORD || '',
  database: dbName,
  synchronize: false,
  migrationsRun: false,
  logging: true,
  entities: [
    Company,
    User,
    Role,
    Permission,
    RolePermission,
    Department,
    Designation,
    Employee,
    Attendance,
    LeaveType,
    LeaveRecord,
    EmployeeSalaryHistory,
    SalaryAdjustment,
    EmployeeAdvance,
    AdvanceRepayment,
    PayrollPeriod,
    PayrollRecord,
    PayrollCorrection,
    Payslip,
    AuditLog,
    SubscriptionPlan,
    Subscription,
    PaymentTransaction,
    PaymentWebhookEvent,
  ],
  migrations: ['dist/database/migrations/*.js'],
});

export default AppDataSource;
