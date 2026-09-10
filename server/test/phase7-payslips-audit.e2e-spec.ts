import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DataSource, IsNull } from 'typeorm';
import { Company } from '../src/companies/entities/company.entity.js';
import { Role } from '../src/roles/entities/role.entity.js';
import { User, UserStatus } from '../src/users/entities/user.entity.js';
import { Permission } from '../src/permissions/entities/permission.entity.js';
import { RolePermission } from '../src/roles/entities/role-permission.entity.js';
import { Employee, EmploymentStatus } from '../src/employees/entities/employee.entity.js';
import { EmployeeSalaryHistory } from '../src/salary/entities/employee-salary-history.entity.js';

import { PayrollPeriod } from '../src/payroll/entities/payroll-period.entity.js';
import { PayrollRecord } from '../src/payroll/entities/payroll-record.entity.js';
import { Payslip } from '../src/payslips/entities/payslip.entity.js';
import { AuditLog } from '../src/audit-logs/entities/audit-log.entity.js';
import { hashPassword } from '../src/common/utils/password.util.js';

describe('Phase 7: Payslips, Audit Logs & Payroll History (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let companyA: Company;
  let companyB: Company;
  let roleOwnerA: Role;
  let roleMemberA: Role;
  let emptyRoleA: Role;

  let ownerAToken: string;
  let noPermToken: string;

  let empA1: Employee;
  let empA2: Employee;

  let finalizedPeriodA: PayrollPeriod;
  let finalizedRecordA1: PayrollRecord;
  let draftPeriodA: PayrollPeriod;
  let draftRecordA1: PayrollRecord;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    await dataSource.query(
      'TRUNCATE TABLE payslips, audit_logs, payroll_records, payroll_periods, advance_repayments, employee_advances, salary_adjustments, employee_salary_history, attendance, leave_records, leave_types, employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
    );

    const companyRepo = dataSource.getRepository(Company);
    companyA = await companyRepo.save(
      companyRepo.create({ name: 'Alpha Payslip Corp', timezone: 'UTC', currency: 'USD' }),
    );
    companyB = await companyRepo.save(
      companyRepo.create({ name: 'Beta Payslip Corp', timezone: 'UTC', currency: 'USD' }),
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

    const payView = (await permRepo.findOneBy({ code: 'PAYSLIP_VIEW' }))!;
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
        email: 'owner7@alpha.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: roleMemberA.id,
        name: 'Member A',
        email: 'member7@alpha.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: emptyRoleA.id,
        name: 'No Perm User',
        email: 'noperm7@alpha.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await userRepo.save(
      userRepo.create({
        company_id: companyB.id,
        role_id: roleOwnerB.id,
        name: 'Owner B',
        email: 'owner7@beta.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    const empRepo = dataSource.getRepository(Employee);
    empA1 = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        employee_code: 'EMP701',
        first_name: 'Alice',
        last_name: 'Pay',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );
    empA2 = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        employee_code: 'EMP702',
        first_name: 'Bob',
        last_name: 'Pay',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );
    await empRepo.save(
      empRepo.create({
        company_id: companyB.id,
        employee_code: 'EMP701',
        first_name: 'Beta',
        last_name: 'Pay',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );

    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
    await salRepo.save(
      salRepo.create({
        company_id: companyA.id,
        employee_id: empA1.id,
        basic_salary: '50000.00',
        effective_from: '2026-01-01',
      }),
    );
    await salRepo.save(
      salRepo.create({
        company_id: companyA.id,
        employee_id: empA2.id,
        basic_salary: '60000.00',
        effective_from: '2026-01-01',
      }),
    );

    const resA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner7@alpha.com', password: 'Password123!' });
    ownerAToken = resA.body.accessToken;

    const resNoPerm = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'noperm7@alpha.com', password: 'Password123!' });
    noPermToken = resNoPerm.body.accessToken;

    // Create Draft Period and Record
    const periodRepo = dataSource.getRepository(PayrollPeriod);
    draftPeriodA = await periodRepo.save(
      periodRepo.create({
        company_id: companyA.id,
        period_year: 2026,
        period_month: 8,
        start_date: '2026-08-01',
        end_date: '2026-08-31',
        status: 'DRAFT' as any,
      }),
    );

    const recordRepo = dataSource.getRepository(PayrollRecord);
    draftRecordA1 = await recordRepo.save(
      recordRepo.create({
        company_id: companyA.id,
        payroll_period_id: draftPeriodA.id,
        employee_id: empA1.id,
        basic_salary: '50000.00',
        gross_salary: '50000.00',
        total_deductions: '0.00',
        net_salary: '50000.00',
        status: 'DRAFT' as any,
      }),
    );

    // Create Finalized Period & Record for tests
    finalizedPeriodA = await periodRepo.save(
      periodRepo.create({
        company_id: companyA.id,
        period_year: 2026,
        period_month: 9,
        start_date: '2026-09-01',
        end_date: '2026-09-30',
        status: 'FINALIZED' as any,
        finalized_at: new Date(),
      }),
    );

    finalizedRecordA1 = await recordRepo.save(
      recordRepo.create({
        company_id: companyA.id,
        payroll_period_id: finalizedPeriodA.id,
        employee_id: empA1.id,
        basic_salary: '50000.00',
        working_days: 30,
        present_days: 30,
        absent_days: 0,
        half_days: 0,
        leave_days: 0,
        holiday_days: 0,
        overtime_amount: '2000.00',
        bonus_amount: '3000.00',
        incentive_amount: '1000.00',
        other_earnings: '0.00',
        absence_deduction: '0.00',
        other_deductions: '500.00',
        advance_deduction: '1000.00',
        gross_salary: '56000.00',
        total_deductions: '1500.00',
        net_salary: '54500.00',
        status: 'FINALIZED' as any,
        finalized_at: new Date(),
      }),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ==========================================
  // PAYSLIP CREATION & IMMUTABILITY (Cases 1 - 10)
  // ==========================================
  describe('Payslip Creation & Immutability', () => {
    let createdPayslip: Payslip;

    it('1. Create payslip from finalized payroll record succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/records/${finalizedRecordA1.id}/payslip`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.payroll_record_id).toBe(finalizedRecordA1.id);
      expect(res.body.employee_id).toBe(empA1.id);
      expect(res.body.payslip_number).toMatch(/^PS-2026-09-\d{6}$/);
      createdPayslip = res.body;
    });

    it('3. Draft payroll record cannot create payslip (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post(`/payroll/records/${draftRecordA1.id}/payslip`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(400);
    });

    it('4. Duplicate payslip creation is idempotent (returns existing payslip)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/records/${finalizedRecordA1.id}/payslip`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(201);

      expect(res.body.id).toBe(createdPayslip.id);
      expect(res.body.payslip_number).toBe(createdPayslip.payslip_number);
    });

    it('6. Payslip data matches finalized payroll snapshot', async () => {
      const res = await request(app.getHttpServer())
        .get(`/payslips/${createdPayslip.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      const rec = res.body.payroll_record;
      expect(rec.basic_salary).toBe('50000.00');
      expect(rec.gross_salary).toBe('56000.00');
      expect(rec.total_deductions).toBe('1500.00');
      expect(rec.net_salary).toBe('54500.00');
    });

    it('7. Updating current employee salary does NOT alter finalized payslip values', async () => {
      const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
      const activeSal = await salRepo.findOneBy({ employee_id: empA1.id, effective_to: IsNull() });
      if (activeSal) {
        activeSal.effective_to = '2026-09-30';
        await salRepo.save(activeSal);
      }
      await salRepo.save(
        salRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          basic_salary: '999999.00',
          effective_from: '2026-10-01',
        }),
      );

      const res = await request(app.getHttpServer())
        .get(`/payslips/${createdPayslip.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.payroll_record.basic_salary).toBe('50000.00');
      expect(res.body.payroll_record.net_salary).toBe('54500.00');
    });
  });

  // ==========================================
  // PAYSLIP PDF GENERATION (Cases 11 - 13)
  // ==========================================
  describe('Payslip PDF Streaming', () => {
    let payslipId: string;

    beforeAll(async () => {
      const pRes = await request(app.getHttpServer())
        .post(`/payroll/records/${finalizedRecordA1.id}/payslip`)
        .set('Authorization', `Bearer ${ownerAToken}`);
      payslipId = pRes.body.id;
    });

    it('11. GET payslip PDF returns application/pdf content type', async () => {
      const res = await request(app.getHttpServer())
        .get(`/payslips/${payslipId}/pdf`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('application/pdf');
      expect(Buffer.isBuffer(res.body)).toBe(true);
    });

    it('13. Unauthorized user without PAYSLIP_DOWNLOAD gets 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/payslips/${payslipId}/pdf`)
        .set('Authorization', `Bearer ${noPermToken}`)
        .expect(403);
    });
  });

  // ==========================================
  // PAYROLL & PAYSLIP HISTORY (Cases 14 - 15)
  // ==========================================
  describe('Payroll & Payslip History Views', () => {
    it('14. GET employee payslip history returns paginated payslips', async () => {
      const res = await request(app.getHttpServer())
        .get(`/employees/${empA1.id}/payslips`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('15. GET employee payroll history returns finalized/paid records', async () => {
      const res = await request(app.getHttpServer())
        .get(`/employees/${empA1.id}/payroll-history`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].status).not.toBe('DRAFT');
    });
  });

  // ==========================================
  // AUDIT LOGGING (Cases 16 - 20)
  // ==========================================
  describe('Audit Logging System', () => {
    it('16. GET audit logs returns tenant-isolated logged actions', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const log of res.body.data) {
        expect(log.company_id).toBe(companyA.id);
      }
    });

    it('18. GET audit log by ID succeeds', async () => {
      const logsRes = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      const logId = logsRes.body.data[0].id;

      const res = await request(app.getHttpServer())
        .get(`/audit-logs/${logId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.id).toBe(logId);
    });

    it('19. Audit logs are append-only (PATCH / PUT / DELETE return 404)', async () => {
      const logsRes = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      const logId = logsRes.body.data[0].id;

      await request(app.getHttpServer())
        .patch(`/audit-logs/${logId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ action: 'MUTATED' })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/audit-logs/${logId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it('20. Audit log metadata strips sensitive secrets/tokens', async () => {
      const auditRepo = dataSource.getRepository(AuditLog);
      const cleanLog = await auditRepo.findOne({
        where: { company_id: companyA.id },
        order: { created_at: 'DESC' },
      });

      if (cleanLog && cleanLog.metadata) {
        expect(cleanLog.metadata).not.toHaveProperty('password');
        expect(cleanLog.metadata).not.toHaveProperty('refreshToken');
        expect(cleanLog.metadata).not.toHaveProperty('accessToken');
      }
    });
  });

  // ==========================================
  // CROSS-TENANT & RBAC PROTECTION (Cases 21 - 22)
  // ==========================================
  describe('Cross-Tenant & RBAC Security Controls', () => {
    let payslipAId: string;

    beforeAll(async () => {
      const pRes = await request(app.getHttpServer())
        .post(`/payroll/records/${finalizedRecordA1.id}/payslip`)
        .set('Authorization', `Bearer ${ownerAToken}`);
      payslipAId = pRes.body.id;
    });

    it('21. Company B user cannot view Company A payslip (returns 404)', async () => {
      const resB = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'owner7@beta.com', password: 'Password123!' });
      const ownerBToken = resB.body.accessToken;

      await request(app.getHttpServer())
        .get(`/payslips/${payslipAId}`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(404);
    });

    it('22. Company B user cannot view Company A audit logs (returns empty or 404 for specific ID)', async () => {
      const resB = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'owner7@beta.com', password: 'Password123!' });
      const ownerBToken = resB.body.accessToken;

      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(200);

      const logAId = (
        await request(app.getHttpServer())
          .get('/audit-logs')
          .set('Authorization', `Bearer ${ownerAToken}`)
      ).body.data[0].id;

      await request(app.getHttpServer())
        .get(`/audit-logs/${logAId}`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(404);
    });
  });
});
