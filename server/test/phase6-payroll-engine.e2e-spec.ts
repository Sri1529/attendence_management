import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DataSource } from 'typeorm';
import { Company } from '../src/companies/entities/company.entity.js';
import { Role } from '../src/roles/entities/role.entity.js';
import { User, UserStatus } from '../src/users/entities/user.entity.js';
import { Permission } from '../src/permissions/entities/permission.entity.js';
import { RolePermission } from '../src/roles/entities/role-permission.entity.js';
import { Employee, EmploymentStatus } from '../src/employees/entities/employee.entity.js';
import { EmployeeSalaryHistory } from '../src/salary/entities/employee-salary-history.entity.js';
import { Attendance, AttendanceStatus } from '../src/attendance/entities/attendance.entity.js';
import { SalaryAdjustment, AdjustmentStatus, AdjustmentType } from '../src/salary/entities/salary-adjustment.entity.js';
import { AdvanceRepayment } from '../src/advances/entities/advance-repayment.entity.js';
import { PayrollPeriod } from '../src/payroll/entities/payroll-period.entity.js';
import { hashPassword } from '../src/common/utils/password.util.js';

describe('Phase 6: Backend Payroll Engine (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let companyA: Company;
  let companyB: Company;
  let roleOwnerA: Role;
  let roleMemberA: Role;
  let emptyRoleA: Role;

  let ownerAToken: string;
  let memberAToken: string;
  let noPermToken: string;

  let empA1: Employee;
  let empA2: Employee;
  let empB1: Employee;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    await dataSource.query(
      'TRUNCATE TABLE payroll_records, payroll_periods, advance_repayments, employee_advances, salary_adjustments, employee_salary_history, attendance, leave_records, leave_types, employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
    );

    const companyRepo = dataSource.getRepository(Company);
    companyA = await companyRepo.save(
      companyRepo.create({ name: 'Alpha Corp', timezone: 'UTC', currency: 'USD' }),
    );
    companyB = await companyRepo.save(
      companyRepo.create({ name: 'Beta Corp', timezone: 'UTC', currency: 'USD' }),
    );

    const roleRepo = dataSource.getRepository(Role);
    roleOwnerA = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'Company Owner', is_system: true }),
    );
    roleMemberA = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'Basic Member', is_system: false }),
    );
    emptyRoleA = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'Empty Role', is_system: false }),
    );
    const roleOwnerB = await roleRepo.save(
      roleRepo.create({ company_id: companyB.id, name: 'Company Owner', is_system: true }),
    );

    const permRepo = dataSource.getRepository(Permission);
    const rolePermRepo = dataSource.getRepository(RolePermission);
    const allPerms = await permRepo.find();
    for (const perm of allPerms) {
      await rolePermRepo.save(
        rolePermRepo.create({ role_id: roleOwnerA.id, permission_id: perm.id }),
      );
      await rolePermRepo.save(
        rolePermRepo.create({ role_id: roleOwnerB.id, permission_id: perm.id }),
      );
    }

    const payView = (await permRepo.findOneBy({ code: 'PAYROLL_VIEW' }))!;
    await rolePermRepo.save(
      rolePermRepo.create({ role_id: roleMemberA.id, permission_id: payView.id }),
    );

    const userRepo = dataSource.getRepository(User);
    const pwdHash = await hashPassword('Password123!');

    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: roleOwnerA.id,
        name: 'Owner A',
        email: 'owner@alpha.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: roleMemberA.id,
        name: 'Member A',
        email: 'member@alpha.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: emptyRoleA.id,
        name: 'No Perm User',
        email: 'noperm6@alpha.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await userRepo.save(
      userRepo.create({
        company_id: companyB.id,
        role_id: roleOwnerB.id,
        name: 'Owner B',
        email: 'owner@beta.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    const empRepo = dataSource.getRepository(Employee);
    empA1 = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        employee_code: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );
    empA2 = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        employee_code: 'EMP002',
        first_name: 'Jane',
        last_name: 'Smith',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );
    empB1 = await empRepo.save(
      empRepo.create({
        company_id: companyB.id,
        employee_code: 'EMP001',
        first_name: 'Beta',
        last_name: 'User',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );

    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
    await salRepo.save(
      salRepo.create({
        company_id: companyA.id,
        employee_id: empA1.id,
        basic_salary: '30000.00',
        effective_from: '2026-01-01',
      }),
    );
    await salRepo.save(
      salRepo.create({
        company_id: companyA.id,
        employee_id: empA2.id,
        basic_salary: '40000.00',
        effective_from: '2026-01-01',
      }),
    );
    await salRepo.save(
      salRepo.create({
        company_id: companyB.id,
        employee_id: empB1.id,
        basic_salary: '50000.00',
        effective_from: '2026-01-01',
      }),
    );

    const resA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner@alpha.com', password: 'Password123!' });
    ownerAToken = resA.body.accessToken;

    const resMember = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'member@alpha.com', password: 'Password123!' });
    memberAToken = resMember.body.accessToken;

    const resNoPerm = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'noperm6@alpha.com', password: 'Password123!' });
    noPermToken = resNoPerm.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Payroll Period Management', () => {
    let periodSep: any;

    it('1. Create payroll period succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 2026, periodMonth: 9 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.period_year).toBe(2026);
      expect(res.body.period_month).toBe(9);
      expect(res.body.start_date).toBe('2026-09-01');
      expect(res.body.end_date).toBe('2026-09-30');
      expect(res.body.status).toBe('DRAFT');
      periodSep = res.body;
    });

    it('2. Duplicate payroll period within company is rejected', async () => {
      await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 2026, periodMonth: 9 })
        .expect(400);
    });

    it('3. List payroll periods succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('4. View payroll period by ID succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/payroll/periods/${periodSep.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.id).toBe(periodSep.id);
    });

    it('5. Cross-tenant payroll period access is rejected with 404', async () => {
      const pRepo = dataSource.getRepository(PayrollPeriod);
      const periodB = await pRepo.save(
        pRepo.create({
          company_id: companyB.id,
          period_year: 2026,
          period_month: 9,
          start_date: '2026-09-01',
          end_date: '2026-09-30',
        }),
      );

      await request(app.getHttpServer())
        .get(`/payroll/periods/${periodB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it('6. Invalid period month (<1 or >12) is rejected', async () => {
      await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 2026, periodMonth: 13 })
        .expect(400);
    });

    it('7. Invalid period year is rejected', async () => {
      await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 1990, periodMonth: 9 })
        .expect(400);
    });

    it('8. User without PAYROLL_GENERATE receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ periodYear: 2026, periodMonth: 10 })
        .expect(403);
    });
  });

  describe('Payroll Calculation & Formulas', () => {
    let periodOct: any;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 2026, periodMonth: 10 })
        .expect(201);
      periodOct = res.body;

      const attRepo = dataSource.getRepository(Attendance);
      await attRepo.save(
        attRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-02',
          status: AttendanceStatus.ABSENT,
        }),
      );
      await attRepo.save(
        attRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-03',
          status: AttendanceStatus.HALF_DAY,
        }),
      );
      await attRepo.save(
        attRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-04',
          status: AttendanceStatus.HOLIDAY,
        }),
      );
      await attRepo.save(
        attRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-05',
          status: AttendanceStatus.LEAVE,
        }),
      );

      const adjRepo = dataSource.getRepository(SalaryAdjustment);
      await adjRepo.save(
        adjRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          adjustment_type: AdjustmentType.OVERTIME,
          amount: '2000.00',
          adjustment_date: '2026-10-10',
          status: AdjustmentStatus.ACTIVE,
        }),
      );
      await adjRepo.save(
        adjRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          adjustment_type: AdjustmentType.BONUS,
          amount: '5000.00',
          adjustment_date: '2026-10-15',
          status: AdjustmentStatus.ACTIVE,
        }),
      );
      await adjRepo.save(
        adjRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          adjustment_type: AdjustmentType.INCENTIVE,
          amount: '1000.00',
          adjustment_date: '2026-10-20',
          status: AdjustmentStatus.ACTIVE,
        }),
      );
      await adjRepo.save(
        adjRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          adjustment_type: AdjustmentType.OTHER_EARNING,
          amount: '500.00',
          adjustment_date: '2026-10-22',
          status: AdjustmentStatus.ACTIVE,
        }),
      );
      await adjRepo.save(
        adjRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          adjustment_type: AdjustmentType.OTHER_DEDUCTION,
          amount: '400.00',
          adjustment_date: '2026-10-25',
          status: AdjustmentStatus.ACTIVE,
        }),
      );
      await adjRepo.save(
        adjRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          adjustment_type: AdjustmentType.BONUS,
          amount: '9999.00',
          adjustment_date: '2026-10-28',
          status: AdjustmentStatus.CANCELLED,
        }),
      );
    });

    it('9. Generate payroll calculates all active employees', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${periodOct.id}/generate`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({})
        .expect(201);

      expect(res.body.employeeCount).toBe(2);
    });

    it('10 - 22. Payroll record contains exact basic salary, earnings, attendance deductions, and net calculation', async () => {
      const recordsRes = await request(app.getHttpServer())
        .get(`/payroll/periods/${periodOct.id}/records?employeeId=${empA1.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      const rec = recordsRes.body.data[0];
      expect(rec.basic_salary).toBe('30000.00');
      expect(rec.working_days).toBe(30);
      expect(rec.absent_days).toBe(1);
      expect(rec.half_days).toBe(1);
      expect(rec.holiday_days).toBe(1);
      expect(rec.leave_days).toBe(1);

      expect(rec.absence_deduction).toBe('1500.00');
      expect(rec.overtime_amount).toBe('2000.00');
      expect(rec.bonus_amount).toBe('5000.00');
      expect(rec.incentive_amount).toBe('1000.00');
      expect(rec.other_earnings).toBe('500.00');
      expect(rec.other_deductions).toBe('400.00');

      expect(rec.gross_salary).toBe('38500.00');
      expect(rec.total_deductions).toBe('1900.00');
      expect(rec.net_salary).toBe('36600.00');
    });

    it('23. Missing basic salary for active employee prevents payroll generation', async () => {
      const empRepo = dataSource.getRepository(Employee);
      const empA3 = await empRepo.save(
        empRepo.create({
          company_id: companyA.id,
          employee_code: 'EMP003',
          first_name: 'NoSal',
          last_name: 'User',
          joining_date: '2026-01-01',
          employment_status: EmploymentStatus.ACTIVE,
        }),
      );

      const periodNov = await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 2026, periodMonth: 11 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodNov.body.id}/generate`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({})
        .expect(400);

      await empRepo.delete(empA3.id);
    });

    it('24. Adjustments outside period are excluded', async () => {
      const adjRepo = dataSource.getRepository(SalaryAdjustment);
      await adjRepo.save(
        adjRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          adjustment_type: AdjustmentType.BONUS,
          amount: '8888.00',
          adjustment_date: '2026-11-15',
          status: AdjustmentStatus.ACTIVE,
        }),
      );

      const recordsRes = await request(app.getHttpServer())
        .get(`/payroll/periods/${periodOct.id}/records?employeeId=${empA1.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(recordsRes.body.data[0].bonus_amount).toBe('5000.00');
    });
  });

  describe('Advance Deductions & Repayment Auto-Linkage', () => {
    let periodDec: any;
    let advanceEmp1: any;

    beforeAll(async () => {
      const periodRes = await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 2026, periodMonth: 12 })
        .expect(201);
      periodDec = periodRes.body;

      const advRes = await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/advances`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ amount: '10000.00', advanceDate: '2026-12-01' })
        .expect(201);
      advanceEmp1 = advRes.body;
    });

    it('25 & 26. Generate payroll with explicit advance deduction succeeds', async () => {
      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodDec.id}/generate`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          advanceDeductions: [{ advanceId: advanceEmp1.id, amount: '3000.00' }],
        })
        .expect(201);

      const recRes = await request(app.getHttpServer())
        .get(`/payroll/periods/${periodDec.id}/records?employeeId=${empA1.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(recRes.body.data[0].advance_deduction).toBe('3000.00');
    });

    it('29. Advance deduction exceeding outstanding balance is rejected', async () => {
      const pRepo = dataSource.getRepository(PayrollPeriod);
      const periodJan = await pRepo.save(
        pRepo.create({
          company_id: companyA.id,
          period_year: 2027,
          period_month: 1,
          start_date: '2027-01-01',
          end_date: '2027-01-31',
        }),
      );

      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodJan.id}/generate`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          advanceDeductions: [{ advanceId: advanceEmp1.id, amount: '15000.00' }],
        })
        .expect(400);
    });

    it('34 - 36. Finalizing payroll creates linked advance repayment and updates advance status', async () => {
      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodDec.id}/finalize`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(201);

      const pRes = await request(app.getHttpServer())
        .get(`/payroll/periods/${periodDec.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(pRes.body.status).toBe('FINALIZED');

      const repRepo = dataSource.getRepository(AdvanceRepayment);
      const rep = await repRepo.findOne({
        where: { company_id: companyA.id, advance_id: advanceEmp1.id },
      });

      expect(rep).not.toBeNull();
      expect(rep!.amount).toBe('3000.00');
      expect(rep!.payroll_record_id).not.toBeNull();

      const advRes = await request(app.getHttpServer())
        .get(`/advances/${advanceEmp1.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(advRes.body.outstandingBalance).toBe('7000.00');
    });

    it('35. Re-submitting finalization request is rejected with 400', async () => {
      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodDec.id}/finalize`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(400);
    });
  });

  describe('State Machine & Immutability Rules', () => {
    let periodMar: any;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 2026, periodMonth: 3 })
        .expect(201);
      periodMar = res.body;

      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodMar.id}/generate`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({})
        .expect(201);
    });

    it('47. Finalized payroll cannot be regenerated', async () => {
      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodMar.id}/finalize`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodMar.id}/generate`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({})
        .expect(400);
    });

    it('49. Finalized payroll can be marked paid', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${periodMar.id}/paid`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(201);

      expect(res.body.status).toBe('PAID');
    });

    it('50 & 51. Paid payroll cannot be regenerated or cancelled', async () => {
      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodMar.id}/generate`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodMar.id}/cancel`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(400);
    });

    it('52. Draft payroll can be cancelled', async () => {
      const draftP = await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 2026, periodMonth: 4 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${draftP.body.id}/cancel`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(201);

      expect(res.body.status).toBe('CANCELLED');
    });
  });

  describe('Tenant Isolation & RBAC', () => {
    let periodTenant: any;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 2026, periodMonth: 5 })
        .expect(201);
      periodTenant = res.body;
    });

    it('65. Cross-tenant generate/finalize/paid operations return 404', async () => {
      const ownerBRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'owner@beta.com', password: 'Password123!' });
      const ownerBToken = ownerBRes.body.accessToken;

      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodTenant.id}/generate`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .send({})
        .expect(404);

      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodTenant.id}/finalize`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(404);
    });

    it('66. Unauthorized user without permissions returns 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodTenant.id}/generate`)
        .set('Authorization', `Bearer ${noPermToken}`)
        .send({})
        .expect(403);

      await request(app.getHttpServer())
        .post(`/payroll/periods/${periodTenant.id}/finalize`)
        .set('Authorization', `Bearer ${noPermToken}`)
        .expect(403);
    });

    it('67. Creating a payroll period for a month whose previous period was CANCELLED succeeds and reopens as DRAFT', async () => {
      const cancelRes = await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 2026, periodMonth: 7 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/payroll/periods/${cancelRes.body.id}/cancel`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(201);

      const recreateRes = await request(app.getHttpServer())
        .post('/payroll/periods')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ periodYear: 2026, periodMonth: 7 })
        .expect(201);

      expect(recreateRes.body.id).toBe(cancelRes.body.id);
      expect(recreateRes.body.status).toBe('DRAFT');
    });
  });
});
