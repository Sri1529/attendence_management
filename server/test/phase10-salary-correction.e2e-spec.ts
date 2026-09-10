import { describe, it, expect, beforeAll } from 'vitest';
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
import { Employee, EmploymentStatus } from '../src/employees/entities/employee.entity.js';
import { EmployeeSalaryHistory } from '../src/salary/entities/employee-salary-history.entity.js';
import { PayrollPeriod, PayrollPeriodStatus } from '../src/payroll/entities/payroll-period.entity.js';
import { PayrollRecord, PayrollRecordStatus } from '../src/payroll/entities/payroll-record.entity.js';
import { AuditLog } from '../src/audit-logs/entities/audit-log.entity.js';
import { hashPassword } from '../src/common/utils/password.util.js';

describe('Phase 10: Salary Record Correction (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let companyA: Company;
  let companyB: Company;

  let ownerAToken: string;
  let noPermToken: string;

  let empA1: Employee;
  let empB1: Employee;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    await dataSource.query(
      'TRUNCATE TABLE payslips, payroll_records, payroll_periods, advance_repayments, employee_advances, salary_adjustments, employee_salary_history, attendance, leave_records, leave_types, employees, departments, designations, role_permissions, users, roles, companies, audit_logs CASCADE;',
    );

    const companyRepo = dataSource.getRepository(Company);
    companyA = await companyRepo.save(
      companyRepo.create({ name: 'Alpha Corp', timezone: 'UTC', currency: 'USD' }),
    );
    companyB = await companyRepo.save(
      companyRepo.create({ name: 'Beta Corp', timezone: 'UTC', currency: 'USD' }),
    );

    const roleRepo = dataSource.getRepository(Role);
    const roleOwnerA = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'Owner', is_system: true }),
    );
    const roleNoPerm = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'NoPerm', is_system: false }),
    );

    const permRepo = dataSource.getRepository(Permission);
    const salaryPerms = await permRepo.find({
      where: [
        { code: 'SALARY_VIEW' },
        { code: 'SALARY_CREATE' },
        { code: 'SALARY_UPDATE' },
        { code: 'PAYROLL_GENERATE' },
        { code: 'PAYROLL_FINALIZE' },
        { code: 'PAYROLL_MARK_PAID' },
        { code: 'AUDIT_LOG_VIEW' },
      ],
    });

    const rolePermRepo = dataSource.getRepository(RolePermission);
    for (const p of salaryPerms) {
      await rolePermRepo.save(
        rolePermRepo.create({ role_id: roleOwnerA.id, permission_id: p.id }),
      );
    }

    const passwordHash = await hashPassword('Password123!');
    const userRepo = dataSource.getRepository(User);
    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: roleOwnerA.id,
        name: 'Owner A',
        email: 'owner@alpha.com',
        password_hash: passwordHash,
      }),
    );
    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: roleNoPerm.id,
        name: 'No Perm',
        email: 'noperm@alpha.com',
        password_hash: passwordHash,
      }),
    );

    const empRepo = dataSource.getRepository(Employee);
    empA1 = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        employee_code: 'EMP-A1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@alpha.com',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );
    empB1 = await empRepo.save(
      empRepo.create({
        company_id: companyB.id,
        employee_code: 'EMP-B1',
        first_name: 'Bob',
        last_name: 'Smith',
        email: 'bob@beta.com',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );

    // Login Owner A
    const loginResA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner@alpha.com', password: 'Password123!' });
    ownerAToken = loginResA.body.accessToken;

    // Login NoPerm
    const loginResNoPerm = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'noperm@alpha.com', password: 'Password123!' });
    noPermToken = loginResNoPerm.body.accessToken;
  });

  it('1. should reject correction without SALARY_UPDATE permission (403)', async () => {
    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
    const sal = await salRepo.save(
      salRepo.create({
        company_id: companyA.id,
        employee_id: empA1.id,
        basic_salary: '30000.00',
        effective_from: '2026-06-01',
        effective_to: null,
      }),
    );

    const res = await request(app.getHttpServer())
      .patch(`/salary-history/${sal.id}/correct`)
      .set('Authorization', `Bearer ${noPermToken}`)
      .send({ basicSalary: '35000.00' });

    expect(res.status).toBe(403);
  });

  it('2. should reject cross-tenant correction (404)', async () => {
    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
    const salB = await salRepo.save(
      salRepo.create({
        company_id: companyB.id,
        employee_id: empB1.id,
        basic_salary: '40000.00',
        effective_from: '2026-06-01',
        effective_to: null,
      }),
    );

    const res = await request(app.getHttpServer())
      .patch(`/salary-history/${salB.id}/correct`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ basicSalary: '45000.00' });

    expect(res.status).toBe(404);
  });

  it('3. should correct salary basic amount successfully and record audit log', async () => {
    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
    const sal = await salRepo.findOneByOrFail({ employee_id: empA1.id });

    const res = await request(app.getHttpServer())
      .patch(`/salary-history/${sal.id}/correct`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ basicSalary: '32000.00', notes: 'Initial correction' });

    expect(res.status).toBe(200);
    expect(res.body.basic_salary).toBe('32000.00');
    expect(res.body.notes).toBe('Initial correction');

    // Verify audit log created
    const auditRepo = dataSource.getRepository(AuditLog);
    const log = await auditRepo.findOne({
      where: { company_id: companyA.id, action: 'SALARY_RECORD_CORRECTED', entity_id: sal.id },
    });
    expect(log).toBeDefined();
    expect(log?.metadata).toMatchObject({
      previousBasicSalary: '30000.00',
      newBasicSalary: '32000.00',
    });
  });

  it('4. should correct effectiveFrom forward successfully and adjust historical ranges', async () => {
    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
    const sal1 = await salRepo.findOneByOrFail({ employee_id: empA1.id });

    // Correct effectiveFrom from 2026-06-01 to 2026-07-01
    const res = await request(app.getHttpServer())
      .patch(`/salary-history/${sal1.id}/correct`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ effectiveFrom: '2026-07-01' });

    expect(res.status).toBe(200);
    expect(res.body.effective_from).toBe('2026-07-01');
    expect(res.body.effective_to).toBeNull();
  });

  it('5. should move effectiveFrom backward and maintain non-overlapping contiguous timeline', async () => {
    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);

    // Create a 2nd salary record for empA1 starting 2026-09-01
    const createRes = await request(app.getHttpServer())
      .post(`/employees/${empA1.id}/salary`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ basicSalary: '40000.00', effectiveFrom: '2026-09-01', notes: 'Promotion' });
    expect(createRes.status).toBe(201);

    const sal2Id = createRes.body.id;

    // Move 2nd record backward from 2026-09-01 to 2026-08-01
    const res = await request(app.getHttpServer())
      .patch(`/salary-history/${sal2Id}/correct`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ effectiveFrom: '2026-08-01' });

    expect(res.status).toBe(200);
    expect(res.body.effective_from).toBe('2026-08-01');

    // Verify record 1 effective_to is 2026-07-31
    const all = await salRepo.find({
      where: { employee_id: empA1.id },
      order: { effective_from: 'ASC' },
    });
    expect(all.length).toBe(2);
    expect(all[0].effective_from).toBe('2026-07-01');
    expect(all[0].effective_to).toBe('2026-07-31');
    expect(all[1].effective_from).toBe('2026-08-01');
    expect(all[1].effective_to).toBeNull();
  });

  it('6. should reject overlapping salary date that conflicts with another record (400)', async () => {
    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
    const all = await salRepo.find({
      where: { employee_id: empA1.id },
      order: { effective_from: 'ASC' },
    });
    const sal2 = all[1];

    // Try correcting sal2's date to 2026-07-01 (same as sal1)
    const res = await request(app.getHttpServer())
      .patch(`/salary-history/${sal2.id}/correct`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ effectiveFrom: '2026-07-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Overlapping salary effective date');
  });

  it('7. should clear DRAFT payroll records when salary is corrected', async () => {
    const periodRepo = dataSource.getRepository(PayrollPeriod);
    const recordRepo = dataSource.getRepository(PayrollRecord);
    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);

    const sal1 = await salRepo.findOneOrFail({
      where: { employee_id: empA1.id, effective_from: '2026-07-01' },
    });

    const periodDraft = await periodRepo.save(
      periodRepo.create({
        company_id: companyA.id,
        period_year: 2026,
        period_month: 7,
        start_date: '2026-07-01',
        end_date: '2026-07-31',
        status: PayrollPeriodStatus.DRAFT,
      }),
    );

    await recordRepo.save(
      recordRepo.create({
        company_id: companyA.id,
        payroll_period_id: periodDraft.id,
        employee_id: empA1.id,
        basic_salary: '32000.00',
        working_days: 30,
        gross_salary: '32000.00',
        total_deductions: '0.00',
        net_salary: '32000.00',
        status: PayrollRecordStatus.DRAFT,
      }),
    );

    // Correcting sal1 should succeed and clear the draft record
    const res = await request(app.getHttpServer())
      .patch(`/salary-history/${sal1.id}/correct`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ basicSalary: '33000.00' });

    expect(res.status).toBe(200);

    const draftRecs = await recordRepo.find({
      where: { employee_id: empA1.id, payroll_period_id: periodDraft.id },
    });
    expect(draftRecs.length).toBe(0);

    await periodRepo.remove(periodDraft);
  });

  it('8. should reject correction when linked to FINALIZED payroll (409 Conflict)', async () => {
    const periodRepo = dataSource.getRepository(PayrollPeriod);
    const recordRepo = dataSource.getRepository(PayrollRecord);
    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);

    const sal1 = await salRepo.findOneOrFail({
      where: { employee_id: empA1.id, effective_from: '2026-07-01' },
    });

    const periodFinalized = await periodRepo.save(
      periodRepo.create({
        company_id: companyA.id,
        period_year: 2026,
        period_month: 7,
        start_date: '2026-07-01',
        end_date: '2026-07-31',
        status: PayrollPeriodStatus.FINALIZED,
      }),
    );

    await recordRepo.save(
      recordRepo.create({
        company_id: companyA.id,
        payroll_period_id: periodFinalized.id,
        employee_id: empA1.id,
        basic_salary: '33000.00',
        working_days: 30,
        gross_salary: '33000.00',
        total_deductions: '0.00',
        net_salary: '33000.00',
        status: PayrollRecordStatus.FINALIZED,
      }),
    );

    const res = await request(app.getHttpServer())
      .patch(`/salary-history/${sal1.id}/correct`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ basicSalary: '34000.00' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain(
      'Salary record cannot be corrected because it has been used by a finalized or paid payroll.',
    );
  });

  it('9. should reject correction when linked to PAID payroll (409 Conflict)', async () => {
    const periodRepo = dataSource.getRepository(PayrollPeriod);
    const recordRepo = dataSource.getRepository(PayrollRecord);
    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);

    const sal2 = await salRepo.findOneOrFail({
      where: { employee_id: empA1.id, effective_from: '2026-08-01' },
    });

    const periodPaid = await periodRepo.save(
      periodRepo.create({
        company_id: companyA.id,
        period_year: 2026,
        period_month: 8,
        start_date: '2026-08-01',
        end_date: '2026-08-31',
        status: PayrollPeriodStatus.PAID,
      }),
    );

    await recordRepo.save(
      recordRepo.create({
        company_id: companyA.id,
        payroll_period_id: periodPaid.id,
        employee_id: empA1.id,
        basic_salary: '40000.00',
        working_days: 31,
        gross_salary: '40000.00',
        total_deductions: '0.00',
        net_salary: '40000.00',
        status: PayrollRecordStatus.PAID,
      }),
    );

    const res = await request(app.getHttpServer())
      .patch(`/salary-history/${sal2.id}/correct`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ basicSalary: '42000.00' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain(
      'Salary record cannot be corrected because it has been used by a finalized or paid payroll.',
    );
  });

  it('10. should verify failed correction does not write audit log and leaves salary unchanged', async () => {
    const empRepo = dataSource.getRepository(Employee);
    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
    const auditRepo = dataSource.getRepository(AuditLog);

    const empA2 = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        employee_code: 'EMP-A2',
        first_name: 'Alice',
        last_name: 'Wonder',
        email: 'alice@alpha.com',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );

    const sal2 = await salRepo.save(
      salRepo.create({
        company_id: companyA.id,
        employee_id: empA2.id,
        basic_salary: '25000.00',
        effective_from: '2026-01-01',
        effective_to: null,
      }),
    );

    const countBefore = await auditRepo.count({
      where: { company_id: companyA.id, action: 'SALARY_RECORD_CORRECTED' },
    });

    // Attempt invalid amount (should fail 400)
    const res = await request(app.getHttpServer())
      .patch(`/salary-history/${sal2.id}/correct`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ basicSalary: '-5000' });

    expect(res.status).toBe(400);

    const countAfter = await auditRepo.count({
      where: { company_id: companyA.id, action: 'SALARY_RECORD_CORRECTED' },
    });
    expect(countAfter).toBe(countBefore);

    // Verify salary history unchanged
    const unchanged = await salRepo.findOneOrFail({ where: { id: sal2.id } });
    expect(unchanged.basic_salary).toBe('25000.00');
  });
});
