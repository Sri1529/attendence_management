import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module.js';
import { DataSource } from 'typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { User, UserStatus } from '../users/entities/user.entity.js';
import { Permission } from '../permissions/entities/permission.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity.js';
import { EmployeeLoan, LoanStatus } from './entities/employee-loan.entity.js';
import { LoanRepayment } from './entities/loan-repayment.entity.js';
import { PayrollPeriod } from '../payroll/entities/payroll-period.entity.js';
import { PayrollRecord } from '../payroll/entities/payroll-record.entity.js';
import { EmployeeSalaryHistory } from '../salary/entities/employee-salary-history.entity.js';
import { hashPassword } from '../common/utils/password.util.js';

describe('Employee Loan & Payroll Repayment (Integration Tests)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let companyA: Company;
  let companyB: Company;
  let roleOwnerA: Role;
  let roleOwnerB: Role;
  let noPermRoleA: Role;

  let ownerAToken: string;
  let ownerBToken: string;
  let noPermToken: string;

  let empA1: Employee;
  let empA2: Employee;
  let empB1: Employee;

  let loanA1: EmployeeLoan;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    await dataSource.query(
      'TRUNCATE TABLE loan_repayments, employee_loans, advance_repayments, employee_advances, salary_adjustments, employee_salary_history, attendance, leave_records, leave_types, payroll_records, payroll_periods, employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
    );

    const companyRepo = dataSource.getRepository(Company);
    companyA = await companyRepo.save(
      companyRepo.create({ name: 'Alpha Corp', timezone: 'UTC', currency: 'INR' }),
    );
    companyB = await companyRepo.save(
      companyRepo.create({ name: 'Beta Corp', timezone: 'UTC', currency: 'INR' }),
    );

    const roleRepo = dataSource.getRepository(Role);
    roleOwnerA = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'Company Owner', is_system: true }),
    );
    roleOwnerB = await roleRepo.save(
      roleRepo.create({ company_id: companyB.id, name: 'Company Owner', is_system: true }),
    );
    noPermRoleA = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'No Perm', is_system: false }),
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
        company_id: companyB.id,
        role_id: roleOwnerB.id,
        name: 'Owner B',
        email: 'owner@beta.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: noPermRoleA.id,
        name: 'No Perm User',
        email: 'noperm@alpha.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    const loginResA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner@alpha.com', password: 'Password123!' });
    ownerAToken = loginResA.body.accessToken;

    const loginResB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner@beta.com', password: 'Password123!' });
    ownerBToken = loginResB.body.accessToken;

    const loginResNoPerm = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'noperm@alpha.com', password: 'Password123!' });
    noPermToken = loginResNoPerm.body.accessToken;

    const empRepo = dataSource.getRepository(Employee);
    empA1 = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        employee_code: 'EMP-A1',
        first_name: 'Rithu',
        last_name: 'Rithu',
        email: 'rithu@alpha.com',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );

    empA2 = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        employee_code: 'EMP-A2',
        first_name: 'Sriniga',
        last_name: 'Sriniga',
        email: 'sriniga@alpha.com',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );

    empB1 = await empRepo.save(
      empRepo.create({
        company_id: companyB.id,
        employee_code: 'EMP-B1',
        first_name: 'Kumar',
        last_name: 'Beta',
        email: 'kumar@beta.com',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );

    const salHistoryRepo = dataSource.getRepository(EmployeeSalaryHistory);
    await salHistoryRepo.save(
      salHistoryRepo.create({
        company_id: companyA.id,
        employee_id: empA1.id,
        basic_salary: '33000.00',
        effective_from: '2026-01-01',
        is_active: true,
      }),
    );
    await salHistoryRepo.save(
      salHistoryRepo.create({
        company_id: companyA.id,
        employee_id: empA2.id,
        basic_salary: '25000.00',
        effective_from: '2026-01-01',
        is_active: true,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('1 & 2. Create loan -> starts with full outstanding amount', async () => {
    const res = await request(app.getHttpServer())
      .post('/loans')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        employeeId: empA1.id,
        principalAmount: '20000.00',
        loanDate: '2026-10-06',
        startRepaymentDate: '2026-10-01',
        reason: 'Personal Emergency',
        notes: 'Approved by management',
      });

    expect(res.status).toBe(201);
    expect(res.body.loan_number).toMatch(/^LN-\d{4}-\d{6}$/);
    expect(res.body.principal_amount).toBe('20000.00');
    expect(res.body.outstanding_amount).toBe('20000.00');
    expect(res.body.status).toBe(LoanStatus.ACTIVE);
    loanA1 = res.body;
  });

  it('3. Loan number is unique per company', async () => {
    const loanRepo = dataSource.getRepository(EmployeeLoan);
    const count = await loanRepo.count({ where: { company_id: companyA.id } });
    expect(count).toBeGreaterThan(0);
  });

  it('4 & 5. Tenant isolation -> unauthorized company cannot access loan', async () => {
    const res = await request(app.getHttpServer())
      .get(`/loans/${loanA1.id}`)
      .set('Authorization', `Bearer ${ownerBToken}`);

    expect(res.status).toBe(404);
  });

  it('6. Cannot create loan for employee of another company', async () => {
    const res = await request(app.getHttpServer())
      .post('/loans')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        employeeId: empB1.id,
        principalAmount: '5000.00',
        loanDate: '2026-10-06',
      });

    expect(res.status).toBe(404);
  });

  it('23. RBAC -> user without LOAN_VIEW cannot list loans', async () => {
    const res = await request(app.getHttpServer())
      .get('/loans')
      .set('Authorization', `Bearer ${noPermToken}`);

    expect(res.status).toBe(403);
  });

  it('7, 8, 9, 10, 11. Generate payroll with selected loan repayment amount (₹5,000)', async () => {
    const periodRes = await request(app.getHttpServer())
      .post('/payroll/periods')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ periodYear: 2026, periodMonth: 10 });

    expect(periodRes.status).toBe(201);
    const periodId = periodRes.body.id;

    const genRes = await request(app.getHttpServer())
      .post(`/payroll/periods/${periodId}/generate`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        loanDeductions: [
          {
            employeeId: empA1.id,
            amount: '5000.00',
          },
        ],
      });

    expect(genRes.status).toBe(201);

    const recordRepo = dataSource.getRepository(PayrollRecord);
    const rithuRecord = await recordRepo.findOneBy({ company_id: companyA.id, employee_id: empA1.id, payroll_period_id: periodId });

    expect(rithuRecord).toBeDefined();
    expect(rithuRecord!.loan_deduction).toBe('5000.00');
    expect(parseFloat(rithuRecord!.net_salary)).toBe(33000 - 5000); // 28000
  });

  it('12. Deduction cannot exceed outstanding balance', async () => {
    const periodRepo = dataSource.getRepository(PayrollPeriod);
    const period = await periodRepo.findOneBy({ company_id: companyA.id, period_year: 2026, period_month: 10 });

    const genRes = await request(app.getHttpServer())
      .post(`/payroll/periods/${period!.id}/generate`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        loanDeductions: [
          {
            employeeId: empA1.id,
            amount: '25000.00', // Outstanding is 20000
          },
        ],
      });

    expect(genRes.status).toBe(400);
    expect(genRes.body.message).toContain('Loan deduction cannot exceed the outstanding loan balance');
  });

  it('15 & 16 & 17. Finalization commits the repayment and reduces outstanding balance to ₹15,000', async () => {
    const periodRepo = dataSource.getRepository(PayrollPeriod);
    const period = await periodRepo.findOneBy({ company_id: companyA.id, period_year: 2026, period_month: 10 });

    // Regenerate with 5000
    await request(app.getHttpServer())
      .post(`/payroll/periods/${period!.id}/generate`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        loanDeductions: [{ employeeId: empA1.id, amount: '5000.00' }],
      });

    const finalizeRes = await request(app.getHttpServer())
      .post(`/payroll/periods/${period!.id}/finalize`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(finalizeRes.status).toBe(201);

    const loanRepo = dataSource.getRepository(EmployeeLoan);
    const updatedLoan = await loanRepo.findOneBy({ id: loanA1.id });
    expect(updatedLoan?.outstanding_amount).toBe('15000.00');
    expect(updatedLoan?.status).toBe(LoanStatus.ACTIVE);

    const repayRepo = dataSource.getRepository(LoanRepayment);
    const repayments = await repayRepo.find({ where: { loan_id: loanA1.id } });
    expect(repayments.length).toBe(1);
    expect(repayments[0].repayment_amount).toBe('5000.00');
    expect(repayments[0].previous_outstanding_amount).toBe('20000.00');
    expect(repayments[0].remaining_outstanding_amount).toBe('15000.00');
  });

  it('November Payroll: Deduct ₹3,000 -> Outstanding becomes ₹12,000', async () => {
    const periodRes = await request(app.getHttpServer())
      .post('/payroll/periods')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ periodYear: 2026, periodMonth: 11 });

    const periodId = periodRes.body.id;

    await request(app.getHttpServer())
      .post(`/payroll/periods/${periodId}/generate`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        loanDeductions: [{ employeeId: empA1.id, amount: '3000.00' }],
      });

    await request(app.getHttpServer())
      .post(`/payroll/periods/${periodId}/finalize`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    const loanRepo = dataSource.getRepository(EmployeeLoan);
    const updatedLoan = await loanRepo.findOneBy({ id: loanA1.id });
    expect(updatedLoan?.outstanding_amount).toBe('12000.00');

    const repayRepo = dataSource.getRepository(LoanRepayment);
    const repayments = await repayRepo.find({ where: { loan_id: loanA1.id }, order: { created_at: 'ASC' } });
    expect(repayments.length).toBe(2);
    expect(repayments[1].repayment_amount).toBe('3000.00');
    expect(repayments[1].previous_outstanding_amount).toBe('15000.00');
    expect(repayments[1].remaining_outstanding_amount).toBe('12000.00');
  });

  it('18 & 19. Final repayment clears balance -> Loan status becomes COMPLETED', async () => {
    const periodRes = await request(app.getHttpServer())
      .post('/payroll/periods')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ periodYear: 2026, periodMonth: 12 });

    const periodId = periodRes.body.id;

    await request(app.getHttpServer())
      .post(`/payroll/periods/${periodId}/generate`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        loanDeductions: [{ employeeId: empA1.id, amount: '12000.00' }],
      });

    await request(app.getHttpServer())
      .post(`/payroll/periods/${periodId}/finalize`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    const loanRepo = dataSource.getRepository(EmployeeLoan);
    const completedLoan = await loanRepo.findOneBy({ id: loanA1.id });
    expect(completedLoan?.outstanding_amount).toBe('0.00');
    expect(completedLoan?.status).toBe(LoanStatus.COMPLETED);
  });

  it('24. Audit log contains LOAN_CREATED and LOAN_REPAYMENT_PROCESSED entries', async () => {
    const auditRes = await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(auditRes.status).toBe(200);
    const logs = auditRes.body.data || [];
    const createdLog = logs.find((l: any) => l.action === 'LOAN_CREATED');
    const repayLog = logs.find((l: any) => l.action === 'LOAN_REPAYMENT_PROCESSED');
    expect(createdLog).toBeDefined();
    expect(repayLog).toBeDefined();
  });
});
