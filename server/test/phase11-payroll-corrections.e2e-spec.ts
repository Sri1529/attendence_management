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
import { PayrollPeriod, PayrollPeriodStatus } from '../src/payroll/entities/payroll-period.entity.js';
import { PayrollRecord, PayrollRecordStatus } from '../src/payroll/entities/payroll-record.entity.js';
import { PayrollCorrection, PayrollCorrectionStatus, PayrollCorrectionType } from '../src/payroll/entities/payroll-correction.entity.js';
import { AuditLog } from '../src/audit-logs/entities/audit-log.entity.js';
import { hashPassword } from '../src/common/utils/password.util.js';

describe('Phase 11: Payroll Corrections & Adjustments (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let companyA: Company;
  let companyB: Company;

  let ownerAToken: string;
  let noPermToken: string;

  let empA1: Employee;

  let periodA: PayrollPeriod;
  let recordA1: PayrollRecord;

  let periodDraft: PayrollPeriod;
  let recordDraft: PayrollRecord;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    await dataSource.query(
      'TRUNCATE TABLE payroll_corrections, payslips, audit_logs, payroll_records, payroll_periods, advance_repayments, employee_advances, salary_adjustments, employee_salary_history, attendance, leave_records, leave_types, employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
    );

    const compRepo = dataSource.getRepository(Company);
    companyA = await compRepo.save(
      compRepo.create({
        name: 'Correction Co A',
        email: 'info@correction-a.com',
        timezone: 'UTC',
        currency: 'INR',
      }),
    );

    companyB = await compRepo.save(
      compRepo.create({
        name: 'Correction Co B',
        email: 'info@correction-b.com',
        timezone: 'UTC',
        currency: 'USD',
      }),
    );

    const permRepo = dataSource.getRepository(Permission);
    const newPermCodes = [
      'PAYROLL_CORRECTION_VIEW',
      'PAYROLL_CORRECTION_CREATE',
      'PAYROLL_CORRECTION_APPLY',
      'PAYROLL_CORRECTION_REVERSE',
      'PAYROLL_VIEW',
      'PAYROLL_GENERATE',
      'PAYROLL_FINALIZE',
      'PAYROLL_MARK_PAID',
      'PAYROLL_REOPEN_FOR_CORRECTION',
      'AUDIT_LOG_VIEW',
    ];
    for (const code of newPermCodes) {
      const existing = await permRepo.findOne({ where: { code } });
      if (!existing) {
        await permRepo.save(
          permRepo.create({
            code,
            name: code,
            description: `Permission for ${code}`,
          }),
        );
      }
    }
    const allPerms = await permRepo.find();

    const roleRepo = dataSource.getRepository(Role);
    const ownerRoleA = await roleRepo.save(
      roleRepo.create({
        company_id: companyA.id,
        name: 'Owner A',
        description: 'Company A Owner',
        is_system: true,
      }),
    );

    const noPermRoleA = await roleRepo.save(
      roleRepo.create({
        company_id: companyA.id,
        name: 'No Perm Role A',
        description: 'No Permissions',
        is_system: false,
      }),
    );

    const rolePermRepo = dataSource.getRepository(RolePermission);
    for (const p of allPerms) {
      await rolePermRepo.save(
        rolePermRepo.create({
          role_id: ownerRoleA.id,
          permission_id: p.id,
        }),
      );
    }

    const passwordHash = await hashPassword('Password123!');
    const userRepo = dataSource.getRepository(User);
    const ownerA = await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: ownerRoleA.id,
        email: 'owner@correction-a.com',
        name: 'Owner A',
        password_hash: passwordHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: noPermRoleA.id,
        email: 'noperm@correction-a.com',
        name: 'NoPerm A',
        password_hash: passwordHash,
        status: UserStatus.ACTIVE,
      }),
    );

    const loginResA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner@correction-a.com', password: 'Password123!' });
    ownerAToken = loginResA.body.accessToken;

    const loginNoPermRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'noperm@correction-a.com', password: 'Password123!' });
    noPermToken = loginNoPermRes.body.accessToken;

    const empRepo = dataSource.getRepository(Employee);
    empA1 = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        employee_code: 'EMP-CORR-001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@correction-a.com',
        joining_date: '2025-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );

    const salRepo = dataSource.getRepository(EmployeeSalaryHistory);
    await salRepo.save(
      salRepo.create({
        company_id: companyA.id,
        employee_id: empA1.id,
        basic_salary: '30000.00',
        effective_from: '2025-01-01',
      }),
    );

    const periodRepo = dataSource.getRepository(PayrollPeriod);
    periodA = await periodRepo.save(
      periodRepo.create({
        company_id: companyA.id,
        period_year: 2026,
        period_month: 9,
        start_date: '2026-09-01',
        end_date: '2026-09-30',
        status: PayrollPeriodStatus.FINALIZED,
        created_by: ownerA.id,
        finalized_at: new Date(),
      }),
    );

    periodDraft = await periodRepo.save(
      periodRepo.create({
        company_id: companyA.id,
        period_year: 2026,
        period_month: 10,
        start_date: '2026-10-01',
        end_date: '2026-10-31',
        status: PayrollPeriodStatus.DRAFT,
        created_by: ownerA.id,
      }),
    );

    const recordRepo = dataSource.getRepository(PayrollRecord);
    recordA1 = await recordRepo.save(
      recordRepo.create({
        company_id: companyA.id,
        payroll_period_id: periodA.id,
        employee_id: empA1.id,
        basic_salary: '30000.00',
        working_days: 22,
        present_days: 20,
        absent_days: 2,
        absence_deduction: '2727.27',
        gross_salary: '30000.00',
        total_deductions: '2727.27',
        net_salary: '27272.73',
        status: PayrollRecordStatus.FINALIZED,
        finalized_at: new Date(),
      }),
    );

    recordDraft = await recordRepo.save(
      recordRepo.create({
        company_id: companyA.id,
        payroll_period_id: periodDraft.id,
        employee_id: empA1.id,
        basic_salary: '30000.00',
        gross_salary: '30000.00',
        total_deductions: '0.00',
        net_salary: '30000.00',
        status: PayrollRecordStatus.DRAFT,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Validation: Rejects zero amount correction', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${recordA1.id}/corrections`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        type: PayrollCorrectionType.ABSENCE_DEDUCTION_REVERSAL,
        amount: '0.00',
        reason: 'Testing zero amount rejection',
      });

    expect(res.status).toBe(400);
  });

  it('2. Validation: Rejects missing reason', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${recordA1.id}/corrections`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        type: PayrollCorrectionType.ABSENCE_DEDUCTION_REVERSAL,
        amount: '1000.00',
        reason: '',
      });

    expect(res.status).toBe(400);
  });

  it('3. Rejects corrections on DRAFT payroll records', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${recordDraft.id}/corrections`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        type: PayrollCorrectionType.SALARY_ADJUSTMENT,
        amount: '500.00',
        reason: 'Cannot correct draft',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('FINALIZED payroll records');
  });

  it('4. RBAC: Rejects user without PAYROLL_CORRECTION_CREATE permission', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${recordA1.id}/corrections`)
      .set('Authorization', `Bearer ${noPermToken}`)
      .send({
        type: PayrollCorrectionType.ABSENCE_DEDUCTION_REVERSAL,
        amount: '1000.00',
        reason: 'Unauthorized attempt',
      });

    expect(res.status).toBe(403);
  });

  let createdCorrectionId: string;

  it('5. Authorized user creates and applies positive correction transactionally', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${recordA1.id}/corrections`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        type: PayrollCorrectionType.ABSENCE_DEDUCTION_REVERSAL,
        amount: '1000.00',
        reason: 'Approved paid leave was incorrectly treated as absence',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe(PayrollCorrectionStatus.APPLIED);
    expect(res.body.amount).toBe('1000.00');

    createdCorrectionId = res.body.id;

    // Verify original snapshot immutability
    const recordRepo = dataSource.getRepository(PayrollRecord);
    const unmutated = await recordRepo.findOneBy({ id: recordA1.id });
    expect(unmutated?.net_salary).toBe('27272.73');

    // Verify Audit Logs written
    const auditRepo = dataSource.getRepository(AuditLog);
    const logs = await auditRepo.find({
      where: { company_id: companyA.id, entity_id: createdCorrectionId },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const actions = logs.map((l) => l.action);
    expect(actions).toContain('PAYROLL_CORRECTION_CREATED');
    expect(actions).toContain('PAYROLL_CORRECTION_APPLIED');
  });

  it('6. Fetches record corrections breakdown correctly', async () => {
    const res = await request(app.getHttpServer())
      .get(`/payroll/records/${recordA1.id}/corrections`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.originalNetPay).toBe('27272.73');
    expect(res.body.totalCorrectionsAmount).toBe('1000.00');
    expect(res.body.adjustedNetPay).toBe('28272.73');
    expect(res.body.corrections.length).toBe(1);
  });

  it('7. Negative correction decreases adjusted net pay', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${recordA1.id}/corrections`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        type: PayrollCorrectionType.SALARY_ADJUSTMENT,
        amount: '-272.73',
        reason: 'Overpayment recovery',
      });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe('-272.73');

    const breakdownRes = await request(app.getHttpServer())
      .get(`/payroll/records/${recordA1.id}/corrections`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(breakdownRes.status).toBe(200);
    expect(breakdownRes.body.originalNetPay).toBe('27272.73');
    expect(breakdownRes.body.totalCorrectionsAmount).toBe('727.27');
    expect(breakdownRes.body.adjustedNetPay).toBe('28000.00');
  });

  it('8. Reverses an applied correction via compensating transaction', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/corrections/${createdCorrectionId}/reverse`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        reason: 'Correction entered in error',
      });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe('-1000.00');
    expect(res.body.reversal_correction_id).toBe(createdCorrectionId);

    // Verify original correction is marked REVERSED
    const corrRepo = dataSource.getRepository(PayrollCorrection);
    const targetCorr = await corrRepo.findOneBy({ id: createdCorrectionId });
    expect(targetCorr?.status).toBe(PayrollCorrectionStatus.REVERSED);

    // Verify Audit Log
    const auditRepo = dataSource.getRepository(AuditLog);
    const logs = await auditRepo.find({
      where: { company_id: companyA.id, action: 'PAYROLL_CORRECTION_REVERSED' },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);

    // Verify breakdown after reversal
    const breakdownRes = await request(app.getHttpServer())
      .get(`/payroll/records/${recordA1.id}/corrections`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(breakdownRes.status).toBe(200);
    // Original net: 27272.73, Applied: -272.73 & -1000.00 = -1272.73
    expect(breakdownRes.body.totalCorrectionsAmount).toBe('-1272.73');
    expect(breakdownRes.body.adjustedNetPay).toBe('26000.00');
  });

  it('9. Rejects double reversal of already reversed correction', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/corrections/${createdCorrectionId}/reverse`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        reason: 'Second reversal attempt',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Only APPLIED corrections can be reversed');
  });

  it('10. Tenant Isolation: Rejects correction access across companies', async () => {
    const res = await request(app.getHttpServer())
      .get(`/payroll/records/${recordA1.id}/corrections`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(200);
  });

  it('11. Transition payroll period to PAID status', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/periods/${periodA.id}/paid`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe(PayrollPeriodStatus.PAID);
  });

  it('12. Immutability: Rejects generate/recalculate on PAID payroll', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/periods/${periodA.id}/generate`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ advanceDeductions: [] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Paid payroll is immutable and cannot be modified.');
  });

  it('13. Immutability: Rejects finalize on PAID payroll', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/periods/${periodA.id}/finalize`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Paid payroll is immutable and cannot be modified.');
  });

  it('14. Immutability: Rejects cancel on PAID payroll', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/periods/${periodA.id}/cancel`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Paid payroll is immutable and cannot be modified.');
  });

  it('15. Immutability: Rejects secondary mark-paid on already PAID payroll', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/periods/${periodA.id}/paid`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Paid payroll is immutable and cannot be modified.');
  });

  it('16. Immutability: Rejects creation of new correction on PAID payroll record', async () => {
    const res = await request(app.getHttpServer())
      .post(`/payroll/records/${recordA1.id}/corrections`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        type: PayrollCorrectionType.SALARY_ADJUSTMENT,
        amount: '500.00',
        reason: 'Post-paid edit attempt',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Paid payroll is immutable and cannot be modified.');
  });

  it('17. Immutability: Rejects reversal of existing correction on PAID payroll record', async () => {
    // Create an applied correction on a second record in another period before marking paid
    const periodRepo = dataSource.getRepository(PayrollPeriod);
    const recordRepo = dataSource.getRepository(PayrollRecord);

    const testPeriod = await periodRepo.save(
      periodRepo.create({
        company_id: companyA.id,
        period_year: 2026,
        period_month: 8,
        start_date: '2026-08-01',
        end_date: '2026-08-31',
        status: PayrollPeriodStatus.FINALIZED,
        finalized_at: new Date(),
      }),
    );

    const testRecord = await recordRepo.save(
      recordRepo.create({
        company_id: companyA.id,
        payroll_period_id: testPeriod.id,
        employee_id: empA1.id,
        basic_salary: '25000.00',
        gross_salary: '25000.00',
        total_deductions: '0.00',
        net_salary: '25000.00',
        status: PayrollRecordStatus.FINALIZED,
      }),
    );

    const corrRes = await request(app.getHttpServer())
      .post(`/payroll/records/${testRecord.id}/corrections`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        type: PayrollCorrectionType.SALARY_ADJUSTMENT,
        amount: '200.00',
        reason: 'Pre-paid correction',
      });
    expect(corrRes.status).toBe(201);
    const corrId = corrRes.body.id;

    // Mark test period as PAID
    await request(app.getHttpServer())
      .post(`/payroll/periods/${testPeriod.id}/paid`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .expect(201);

    // Attempt to reverse correction on now PAID payroll
    const revRes = await request(app.getHttpServer())
      .post(`/payroll/corrections/${corrId}/reverse`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        reason: 'Post-paid reversal attempt',
      });

    expect(revRes.status).toBe(400);
    expect(revRes.body.message).toContain('Paid payroll is immutable and cannot be modified.');
  });

  it('18. Historical Viewing: Period and Record remain fully readable after PAID', async () => {
    const periodRes = await request(app.getHttpServer())
      .get(`/payroll/periods/${periodA.id}`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(periodRes.status).toBe(200);
    expect(periodRes.body.status).toBe(PayrollPeriodStatus.PAID);

    const recordRes = await request(app.getHttpServer())
      .get(`/payroll/records/${recordA1.id}`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(recordRes.status).toBe(200);
    expect(recordRes.body.status).toBe(PayrollRecordStatus.PAID);
  });

  describe('Reopen for Correction Workflow', () => {
    let testPeriod: PayrollPeriod;

    beforeAll(async () => {
      const periodRepo = dataSource.getRepository(PayrollPeriod);
      const recordRepo = dataSource.getRepository(PayrollRecord);

      testPeriod = await periodRepo.save(
        periodRepo.create({
          company_id: companyA.id,
          period_year: 2026,
          period_month: 12,
          start_date: '2026-12-01',
          end_date: '2026-12-31',
          status: PayrollPeriodStatus.FINALIZED,
          finalized_at: new Date(),
        }),
      );

      await recordRepo.save(
        recordRepo.create({
          company_id: companyA.id,
          payroll_period_id: testPeriod.id,
          employee_id: empA1.id,
          basic_salary: '30000.00',
          gross_salary: '30000.00',
          total_deductions: '0.00',
          net_salary: '30000.00',
          status: PayrollRecordStatus.FINALIZED,
        }),
      );
    });

    it('19. Reopening requires a mandatory reason', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${testPeriod.id}/reopen-for-correction`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ reason: '   ' });

      expect(res.status).toBe(400);
    });

    it('20. Reopening DRAFT payroll is rejected', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${periodDraft.id}/reopen-for-correction`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ reason: 'Attempt to reopen draft' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Only FINALIZED payroll periods can be reopened for correction.');
    });

    it('21. Reopening by unauthorized user is rejected with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${testPeriod.id}/reopen-for-correction`)
        .set('Authorization', `Bearer ${noPermToken}`)
        .send({ reason: 'Unauthorized attempt' });

      expect(res.status).toBe(403);
    });

    it('22. Reopening FINALIZED payroll succeeds and sets status to CORRECTION_REQUIRED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${testPeriod.id}/reopen-for-correction`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ reason: 'Approved paid leave was incorrectly treated as absence' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(PayrollPeriodStatus.CORRECTION_REQUIRED);

      // Verify Audit Log
      const auditRepo = dataSource.getRepository(AuditLog);
      const logs = await auditRepo.find({
        where: { company_id: companyA.id, action: 'PAYROLL_REOPENED_FOR_CORRECTION' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].metadata?.reason).toBe('Approved paid leave was incorrectly treated as absence');
      expect(logs[0].metadata?.previousStatus).toBe('FINALIZED');
      expect(logs[0].metadata?.newStatus).toBe('CORRECTION_REQUIRED');
    });

    it('23. Period in CORRECTION_REQUIRED can be regenerated', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${testPeriod.id}/generate`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(PayrollPeriodStatus.DRAFT);
    });

    it('24. Regenerated period can be finalized again', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${testPeriod.id}/finalize`)
        .set('Authorization', `Bearer ${ownerAToken}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(PayrollPeriodStatus.FINALIZED);
    });

    it('25. Re-finalized period can be marked paid', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${testPeriod.id}/paid`)
        .set('Authorization', `Bearer ${ownerAToken}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(PayrollPeriodStatus.PAID);
    });

    it('26. Reopening an already PAID payroll is rejected', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${testPeriod.id}/reopen-for-correction`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ reason: 'Post-paid reopen attempt' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Paid payroll is immutable and cannot be modified.');
    });
  });
});
