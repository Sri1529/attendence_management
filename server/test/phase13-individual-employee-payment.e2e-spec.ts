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
import { PayrollPeriod, PayrollPeriodStatus } from '../src/payroll/entities/payroll-period.entity.js';
import { PayrollRecord, PayrollRecordStatus, PaymentStatus, PaymentMethod } from '../src/payroll/entities/payroll-record.entity.js';
import { EmployeeSalaryHistory } from '../src/salary/entities/employee-salary-history.entity.js';
import { AuditLog } from '../src/audit-logs/entities/audit-log.entity.js';
import { hashPassword } from '../src/common/utils/password.util.js';

describe('Phase 13: Individual Employee Payment Tracking (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let companyA: Company;
  let ownerTokenA: string;
  let ownerUserA: User;

  let companyB: Company;
  let ownerTokenB: string;

  let employee1: Employee;
  let employee2: Employee;
  let period: PayrollPeriod;
  let record1: PayrollRecord;
  let record2: PayrollRecord;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    await dataSource.query(
      'TRUNCATE TABLE audit_logs, advance_repayments, loan_repayments, payroll_records, payroll_periods, employee_salary_history, employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
    );

    const companyRepo = dataSource.getRepository(Company);
    companyA = await companyRepo.save(
      companyRepo.create({ name: 'Payment Company A', timezone: 'UTC', currency: 'INR' }),
    );
    companyB = await companyRepo.save(
      companyRepo.create({ name: 'Payment Company B', timezone: 'UTC', currency: 'INR' }),
    );

    const roleRepo = dataSource.getRepository(Role);
    const roleA = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'Company Owner A', is_system: true }),
    );
    const roleB = await roleRepo.save(
      roleRepo.create({ company_id: companyB.id, name: 'Company Owner B', is_system: true }),
    );

    const permRepo = dataSource.getRepository(Permission);
    const rolePermRepo = dataSource.getRepository(RolePermission);
    const allPerms = await permRepo.find();

    for (const perm of allPerms) {
      await rolePermRepo.save(rolePermRepo.create({ role_id: roleA.id, permission_id: perm.id }));
      await rolePermRepo.save(rolePermRepo.create({ role_id: roleB.id, permission_id: perm.id }));
    }

    const userRepo = dataSource.getRepository(User);
    const pwdHash = await hashPassword('Password123!');
    ownerUserA = await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: roleA.id,
        name: 'Admin A',
        email: 'admin-payment-a@acme.com',
        password_hash: pwdHash,
      }),
    );
    const ownerUserB = await userRepo.save(
      userRepo.create({
        company_id: companyB.id,
        role_id: roleB.id,
        name: 'Admin B',
        email: 'admin-payment-b@acme.com',
        password_hash: pwdHash,
      }),
    );

    const loginResA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-payment-a@acme.com', password: 'Password123!' });
    ownerTokenA = loginResA.body.accessToken;

    const loginResB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-payment-b@acme.com', password: 'Password123!' });
    ownerTokenB = loginResB.body.accessToken;

    const empRepo = dataSource.getRepository(Employee);
    employee1 = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        first_name: 'Rithu',
        last_name: 'Rithu',
        employee_code: 'EMP-001',
        email: 'rithu@acme.com',
        joining_date: '2025-01-01',
      }),
    );
    employee2 = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        first_name: 'Sriniga',
        last_name: 'Sriniga',
        employee_code: 'EMP-002',
        email: 'sriniga@acme.com',
        joining_date: '2025-01-01',
      }),
    );

    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
    await salRepo.save(
      salRepo.create({
        company_id: companyA.id,
        employee_id: employee1.id,
        basic_salary: '30000.00',
        effective_from: '2025-01-01',
      }),
    );
    await salRepo.save(
      salRepo.create({
        company_id: companyA.id,
        employee_id: employee2.id,
        basic_salary: '27500.00',
        effective_from: '2025-01-01',
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Create payroll period and generate draft payroll', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/payroll/periods')
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({ periodYear: 2026, periodMonth: 10 });

    expect(createRes.status).toBe(201);
    period = createRes.body;
    expect(period.status).toBe(PayrollPeriodStatus.DRAFT);

    const genRes = await request(app.getHttpServer())
      .post(`/payroll/periods/${period.id}/generate`)
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({});

    expect(genRes.status).toBe(201);

    const recsRes = await request(app.getHttpServer())
      .get(`/payroll/periods/${period.id}/records`)
      .set('Authorization', `Bearer ${ownerTokenA}`);

    expect(recsRes.status).toBe(200);
    expect(recsRes.body.data.length).toBe(2);

    record1 = recsRes.body.data.find((r: any) => r.employee_id === employee1.id);
    record2 = recsRes.body.data.find((r: any) => r.employee_id === employee2.id);

    expect(record1.payment_status).toBe(PaymentStatus.UNPAID);
    expect(record2.payment_status).toBe(PaymentStatus.UNPAID);
  });

  it('2. Cannot pay record when payroll period is in DRAFT state', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${record1.id}/pay`)
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({ paymentDate: '2026-10-04', paymentMethod: 'BANK_TRANSFER' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Only FINALIZED payroll records can be marked as paid');
  });

  it('3. Finalize payroll period', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/periods/${period.id}/finalize`)
      .set('Authorization', `Bearer ${ownerTokenA}`);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe(PayrollPeriodStatus.FINALIZED);
  });

  it('4. Mark single employee (record1) as PAID', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${record1.id}/pay`)
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({
        paymentDate: '2026-10-04',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentReference: 'TXN123456',
      });

    expect(res.status).toBe(201);
    expect(res.body.payment_status).toBe(PaymentStatus.PAID);
    expect(res.body.status).toBe(PayrollRecordStatus.PAID);
    expect(res.body.payment_date).toBe('2026-10-04');
    expect(res.body.payment_method).toBe(PaymentMethod.BANK_TRANSFER);
    expect(res.body.payment_reference).toBe('TXN123456');
    expect(res.body.paid_at).toBeDefined();
    expect(res.body.paid_by).toBe(ownerUserA.id);
  });

  it('5. Verify marking record1 as PAID does NOT affect record2', async () => {
    const res = await request(app.getHttpServer())
      .get(`/payroll/records/${record2.id}`)
      .set('Authorization', `Bearer ${ownerTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.payment_status).toBe(PaymentStatus.UNPAID);
    expect(res.body.status).toBe(PayrollRecordStatus.FINALIZED);
    expect(res.body.payment_date).toBeNull();
  });

  it('6. Payroll period transitions to PARTIALLY_PAID status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/payroll/periods/${period.id}`)
      .set('Authorization', `Bearer ${ownerTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(PayrollPeriodStatus.PARTIALLY_PAID);
    expect(res.body.paymentSummary).toEqual({
      paidEmployees: 1,
      unpaidEmployees: 1,
      totalEmployees: 2,
      paidAmount: '30000.00',
      unpaidAmount: '27500.00',
    });
  });

  it('7. Cannot pay an already PAID payroll record (duplicate payment rejected)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${record1.id}/pay`)
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({ paymentDate: '2026-10-04' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Employee salary has already been marked as paid.');
  });

  it('8. Mark second employee (record2) as PAID', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${record2.id}/pay`)
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({
        paymentDate: '2026-10-10',
        paymentMethod: PaymentMethod.UPI,
        paymentReference: 'UPI-987654',
      });

    expect(res.status).toBe(201);
    expect(res.body.payment_status).toBe(PaymentStatus.PAID);
    expect(res.body.payment_date).toBe('2026-10-10');
    expect(res.body.payment_method).toBe(PaymentMethod.UPI);
  });

  it('9. Payroll period transitions to PAID when all employees are paid', async () => {
    const res = await request(app.getHttpServer())
      .get(`/payroll/periods/${period.id}`)
      .set('Authorization', `Bearer ${ownerTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(PayrollPeriodStatus.PAID);
    expect(res.body.paymentSummary).toEqual({
      paidEmployees: 2,
      unpaidEmployees: 0,
      totalEmployees: 2,
      paidAmount: '57500.00',
      unpaidAmount: '0.00',
    });
  });

  it('10. Immutability: Payment does not modify salary calculations', async () => {
    const res = await request(app.getHttpServer())
      .get(`/payroll/records/${record1.id}`)
      .set('Authorization', `Bearer ${ownerTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.basic_salary).toBe('30000.00');
    expect(res.body.net_salary).toBe('30000.00');
    expect(res.body.gross_salary).toBe('30000.00');
  });

  it('11. Tenant isolation: User from Company B cannot pay Company A record', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${record1.id}/pay`)
      .set('Authorization', `Bearer ${ownerTokenB}`)
      .send({ paymentDate: '2026-10-04' });

    expect(res.status).toBe(404);
  });

  it('12. Audit log entry created for individual payment', async () => {
    const auditRepo = dataSource.getRepository(AuditLog);
    const logs = await auditRepo.find({
      where: { company_id: companyA.id, action: 'EMPLOYEE_PAYROLL_MARKED_PAID' },
    });

    expect(logs.length).toBeGreaterThanOrEqual(2);
    const log1 = logs.find((l) => l.entity_id === record1.id);
    expect(log1).toBeDefined();
    expect(log1?.metadata).toMatchObject({
      payrollRecordId: record1.id,
      amount: '30000.00',
      paymentDate: '2026-10-04',
      paymentMethod: 'BANK_TRANSFER',
      paymentReference: 'TXN123456',
    });
  });
});
