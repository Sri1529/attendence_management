import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Company } from './companies/entities/company.entity.js';
import { User } from './users/entities/user.entity.js';
import { Role } from './roles/entities/role.entity.js';
import { Permission } from './permissions/entities/permission.entity.js';
import { RolePermission } from './roles/entities/role-permission.entity.js';
import { Department } from './departments/entities/department.entity.js';
import { Designation } from './designations/entities/designation.entity.js';
import { Employee } from './employees/entities/employee.entity.js';
import { Attendance } from './attendance/entities/attendance.entity.js';
import { LeaveType } from './leave-types/entities/leave-type.entity.js';
import { LeaveRecord } from './leave-records/entities/leave-record.entity.js';
import { EmployeeSalaryHistory } from './salary/entities/employee-salary-history.entity.js';
import { SalaryAdjustment } from './salary/entities/salary-adjustment.entity.js';
import { EmployeeAdvance } from './advances/entities/employee-advance.entity.js';
import { AdvanceRepayment } from './advances/entities/advance-repayment.entity.js';
import { PayrollPeriod } from './payroll/entities/payroll-period.entity.js';
import { PayrollRecord } from './payroll/entities/payroll-record.entity.js';
import { PayrollCorrection } from './payroll/entities/payroll-correction.entity.js';
import { Payslip } from './payslips/entities/payslip.entity.js';
import { AuditLog } from './audit-logs/entities/audit-log.entity.js';
import { SubscriptionPlan } from './subscriptions/entities/subscription-plan.entity.js';
import { Subscription } from './subscriptions/entities/subscription.entity.js';
import { PaymentTransaction } from './payments/entities/payment-transaction.entity.js';
import { PaymentWebhookEvent } from './payments/entities/payment-webhook-event.entity.js';
import { AuthModule } from './auth/auth.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { UsersModule } from './users/users.module.js';
import { RolesModule } from './roles/roles.module.js';
import { PermissionsModule } from './permissions/permissions.module.js';
import { DepartmentsModule } from './departments/departments.module.js';
import { DesignationsModule } from './designations/designations.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { LeaveTypesModule } from './leave-types/leave-types.module.js';
import { LeaveRecordsModule } from './leave-records/leave-records.module.js';
import { SalaryModule } from './salary/salary.module.js';
import { AdvancesModule } from './advances/advances.module.js';
import { PayrollModule } from './payroll/payroll.module.js';
import { PayslipsModule } from './payslips/payslips.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { SubscriptionGuard } from './common/guards/subscription.guard.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({}),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database:
          configService.get<string>('NODE_ENV') === 'test'
            ? configService.get<string>('DATABASE_TEST_NAME', 'attendence_management_test')
            : configService.get<string>('DATABASE_NAME', 'attendence_management'),
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
        synchronize: false,
        migrationsRun: true,
        migrations: ['dist/database/migrations/*.js'],
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([
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
      PayrollPeriod,
      PayrollRecord,
      Payslip,
      AuditLog,
      SubscriptionPlan,
      Subscription,
      PaymentTransaction,
      PaymentWebhookEvent,
    ]),
    AuthModule,
    CompaniesModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    DepartmentsModule,
    DesignationsModule,
    EmployeesModule,
    AttendanceModule,
    LeaveTypesModule,
    LeaveRecordsModule,
    SalaryModule,
    AdvancesModule,
    PayrollModule,
    PayslipsModule,
    AuditLogsModule,
    SubscriptionsModule,
    PaymentsModule,
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'attendance-payroll-backend',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
  ],
})
export class AppModule {}
