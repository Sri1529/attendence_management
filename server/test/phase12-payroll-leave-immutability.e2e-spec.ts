import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DataSource } from 'typeorm';
import { Company } from '../src/companies/entities/company.entity.js';
import { Role } from '../src/roles/entities/role.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { Permission } from '../src/permissions/entities/permission.entity.js';
import { RolePermission } from '../src/roles/entities/role-permission.entity.js';
import { Employee } from '../src/employees/entities/employee.entity.js';
import { LeaveType, LeaveTypeStatus } from '../src/leave-types/entities/leave-type.entity.js';
import { LeaveRecord, LeaveStatus } from '../src/leave-records/entities/leave-record.entity.js';
import { PayrollPeriod, PayrollPeriodStatus } from '../src/payroll/entities/payroll-period.entity.js';
import { PayrollRecord, PayrollRecordStatus } from '../src/payroll/entities/payroll-record.entity.js';
import { EmployeeSalaryHistory } from '../src/salary/entities/employee-salary-history.entity.js';
import { Attendance, AttendanceStatus } from '../src/attendance/entities/attendance.entity.js';
import { hashPassword } from '../src/common/utils/password.util.js';

describe('Phase 12: Payroll Leave & Attendance Immutability (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let company: Company;
  let ownerRole: Role;
  let ownerToken: string;

  let employee: Employee;
  let leaveType: LeaveType;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    await dataSource.query(
      'TRUNCATE TABLE attendance, leave_records, leave_types, payroll_records, payroll_periods, employee_salary_history, employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
    );

    const companyRepo = dataSource.getRepository(Company);
    company = await companyRepo.save(
      companyRepo.create({ name: 'Acme Corp Immutability Test', timezone: 'UTC', currency: 'USD' }),
    );

    const roleRepo = dataSource.getRepository(Role);
    ownerRole = await roleRepo.save(
      roleRepo.create({ company_id: company.id, name: 'Company Owner', is_system: true }),
    );

    const permRepo = dataSource.getRepository(Permission);
    const rolePermRepo = dataSource.getRepository(RolePermission);
    const allPerms = await permRepo.find();
    for (const perm of allPerms) {
      await rolePermRepo.save(
        rolePermRepo.create({ role_id: ownerRole.id, permission_id: perm.id }),
      );
    }

    const userRepo = dataSource.getRepository(User);
    const pwdHash = await hashPassword('Password123!');
    const ownerUser = await userRepo.save(
      userRepo.create({
        company_id: company.id,
        role_id: ownerRole.id,
        name: 'Owner User',
        email: 'owner-immutability@acme.com',
        password_hash: pwdHash,
        first_name: 'Owner',
        last_name: 'User',
      }),
    );

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner-immutability@acme.com', password: 'Password123!' });

    ownerToken = loginRes.body.accessToken;

    const empRepo = dataSource.getRepository(Employee);
    employee = await empRepo.save(
      empRepo.create({
        company_id: company.id,
        employee_code: 'EMP-IMMUTABLE-001',
        first_name: 'Iron',
        last_name: 'Man',
        email: 'ironman@acme.com',
        joining_date: '2026-01-01',
      }),
    );

    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
    await salRepo.save(
      salRepo.create({
        company_id: company.id,
        employee_id: employee.id,
        basic_salary: '5000.00',
        effective_from: '2026-01-01',
      }),
    );

    const ltRepo = dataSource.getRepository(LeaveType);
    leaveType = await ltRepo.save(
      ltRepo.create({
        company_id: company.id,
        name: 'Emergency Leave',
        status: LeaveTypeStatus.ACTIVE,
        is_paid: true,
      }),
    );
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('1. Approved leave with DRAFT payroll CAN be cancelled', async () => {
    const periodRepo = dataSource.getRepository(PayrollPeriod);
    await periodRepo.save(
      periodRepo.create({
        company_id: company.id,
        period_year: 2026,
        period_month: 8,
        start_date: '2026-08-01',
        end_date: '2026-08-31',
        status: PayrollPeriodStatus.DRAFT,
      }),
    );

    const lrRepo = dataSource.getRepository(LeaveRecord);
    const leave = await lrRepo.save(
      lrRepo.create({
        company_id: company.id,
        employee_id: employee.id,
        leave_type_id: leaveType.id,
        start_date: '2026-08-10',
        end_date: '2026-08-10',
        status: LeaveStatus.APPROVED,
      }),
    );

    const cancelRes = await request(app.getHttpServer())
      .patch(`/leave-records/${leave.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: LeaveStatus.CANCELLED });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe(LeaveStatus.CANCELLED);
  });

  it('2. Approved leave with FINALIZED payroll CANNOT be cancelled directly', async () => {
    const periodRepo = dataSource.getRepository(PayrollPeriod);
    const finalPeriod = await periodRepo.save(
      periodRepo.create({
        company_id: company.id,
        period_year: 2026,
        period_month: 10,
        start_date: '2026-10-01',
        end_date: '2026-10-31',
        status: PayrollPeriodStatus.FINALIZED,
      }),
    );

    const lrRepo = dataSource.getRepository(LeaveRecord);
    const leave = await lrRepo.save(
      lrRepo.create({
        company_id: company.id,
        employee_id: employee.id,
        leave_type_id: leaveType.id,
        start_date: '2026-10-05',
        end_date: '2026-10-05',
        status: LeaveStatus.APPROVED,
      }),
    );

    const cancelRes = await request(app.getHttpServer())
      .patch(`/leave-records/${leave.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: LeaveStatus.CANCELLED });

    expect(cancelRes.status).toBe(400);
    expect(cancelRes.body.message).toContain('finalized payroll');
  });

  it('3. Approved leave with PAID payroll CANNOT be cancelled (September 2026 Exact Scenario)', async () => {
    const periodRepo = dataSource.getRepository(PayrollPeriod);
    const paidPeriod = await periodRepo.save(
      periodRepo.create({
        company_id: company.id,
        period_year: 2026,
        period_month: 9,
        start_date: '2026-09-01',
        end_date: '2026-09-30',
        status: PayrollPeriodStatus.PAID,
      }),
    );

    const lrRepo = dataSource.getRepository(LeaveRecord);
    const leave05 = await lrRepo.save(
      lrRepo.create({
        company_id: company.id,
        employee_id: employee.id,
        leave_type_id: leaveType.id,
        start_date: '2026-09-05',
        end_date: '2026-09-05',
        status: LeaveStatus.APPROVED,
      }),
    );

    const cancelRes = await request(app.getHttpServer())
      .patch(`/leave-records/${leave05.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: LeaveStatus.CANCELLED });

    expect(cancelRes.status).toBe(400);
    expect(cancelRes.body.message).toBe(
      'This leave is locked because it has been included in a paid payroll and cannot be cancelled.',
    );

    // Verify GET /leave-records exposes payroll lock metadata
    const listRes = await request(app.getHttpServer())
      .get('/leave-records')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(listRes.status).toBe(200);
    const item05 = listRes.body.data.find((r: any) => r.id === leave05.id);
    expect(item05).toBeDefined();
    expect(item05.isPayrollLocked).toBe(true);
    expect(item05.payrollLockStatus).toBe('PAID');
    expect(item05.payrollLockMessage).toContain('paid payroll');
  });

  it('4. Attendance CANNOT be created or modified on dates belonging to a PAID payroll', async () => {
    const attRes = await request(app.getHttpServer())
      .post('/attendance')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        employeeId: employee.id,
        attendanceDate: '2026-09-15',
        status: AttendanceStatus.PRESENT,
      });

    expect(attRes.status).toBe(400);
    expect(attRes.body.message).toContain('paid payroll');
  });
});
