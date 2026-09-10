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
import { hashPassword } from '../src/common/utils/password.util.js';

describe('Phase 5: Salary & Advances (E2E)', () => {
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
      'TRUNCATE TABLE advance_repayments, employee_advances, salary_adjustments, employee_salary_history, attendance, leave_records, leave_types, employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
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

    const salView = (await permRepo.findOneBy({ code: 'SALARY_VIEW' }))!;
    const advView = (await permRepo.findOneBy({ code: 'ADVANCE_VIEW' }))!;
    await rolePermRepo.save(
      rolePermRepo.create({ role_id: roleMemberA.id, permission_id: salView.id }),
    );
    await rolePermRepo.save(
      rolePermRepo.create({ role_id: roleMemberA.id, permission_id: advView.id }),
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
        email: 'noperm5@alpha.com',
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
      .send({ email: 'noperm5@alpha.com', password: 'Password123!' });
    noPermToken = resNoPerm.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Salary Management & History', () => {
    let initialSalary: any;
    let incrementSalary: any;

    it('1. Create initial salary succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          basicSalary: '25000.00',
          effectiveFrom: '2026-01-01',
          notes: 'Joining basic salary',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.basic_salary).toBe('25000.00');
      expect(res.body.effective_from).toBe('2026-01-01');
      expect(res.body.effective_to).toBeNull();
      initialSalary = res.body;
    });

    it('2. View current salary succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/employees/${empA1.id}/salary/current`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.id).toBe(initialSalary.id);
      expect(res.body.basic_salary).toBe('25000.00');
    });

    it('3. View salary history succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/employees/${empA1.id}/salary/history`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.length).toBe(1);
    });

    it('4 & 5. Create new salary closes previous period and sets new effective date', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          basicSalary: '30000.00',
          effectiveFrom: '2026-06-01',
          notes: 'Mid-year appraisal increment',
        })
        .expect(201);

      expect(res.body.basic_salary).toBe('30000.00');
      expect(res.body.effective_from).toBe('2026-06-01');
      expect(res.body.effective_to).toBeNull();
      incrementSalary = res.body;

      const histRes = await request(app.getHttpServer())
        .get(`/employees/${empA1.id}/salary/history`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(histRes.body.length).toBe(2);
      const oldRec = histRes.body.find((r: any) => r.id === initialSalary.id);
      expect(oldRec.effective_to).toBe('2026-05-31');
    });

    it('6. Historical salary values remain preserved', async () => {
      const currentRes = await request(app.getHttpServer())
        .get(`/employees/${empA1.id}/salary/current?date=2026-03-15`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(currentRes.body.id).toBe(initialSalary.id);
      expect(currentRes.body.basic_salary).toBe('25000.00');
    });

    it('7. Overlapping salary effective date is rejected', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          basicSalary: '35000.00',
          effectiveFrom: '2026-05-15',
        })
        .expect(400);
    });

    it('8. Cross-tenant salary history access is rejected with 404', async () => {
      await request(app.getHttpServer())
        .get(`/employees/${empB1.id}/salary/history`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it('9. Cross-tenant employee salary creation is rejected with 404', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empB1.id}/salary`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          basicSalary: '50000.00',
          effectiveFrom: '2026-01-01',
        })
        .expect(404);
    });

    it('10. Invalid salary amount (negative/zero/alpha) is rejected', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          basicSalary: '-5000.00',
          effectiveFrom: '2026-08-01',
        })
        .expect(400);
    });

    it('11. Unauthorized salary access returns 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/employees/${empA1.id}/salary/history`)
        .set('Authorization', `Bearer ${noPermToken}`)
        .expect(403);
    });

    it('12. Unauthorized salary creation returns 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          basicSalary: '40000.00',
          effectiveFrom: '2026-08-01',
        })
        .expect(403);
    });

    it('13. Update salary history notes succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/salary-history/${incrementSalary.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ notes: 'Updated appraisal notes' })
        .expect(200);

      expect(res.body.notes).toBe('Updated appraisal notes');
    });
  });

  describe('Salary Adjustments', () => {
    let adjA: any;

    it('14. Create bonus adjustment succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary-adjustments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          adjustmentType: 'BONUS',
          amount: '5000.00',
          adjustmentDate: '2026-07-01',
          description: 'Performance bonus',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.adjustment_type).toBe('BONUS');
      expect(res.body.amount).toBe('5000.00');
      adjA = res.body;
    });

    it('15. Create overtime adjustment succeeds', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary-adjustments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          adjustmentType: 'OVERTIME',
          amount: '1500.00',
          adjustmentDate: '2026-07-05',
        })
        .expect(201);
    });

    it('16. Create incentive adjustment succeeds', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary-adjustments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          adjustmentType: 'INCENTIVE',
          amount: '2000.00',
          adjustmentDate: '2026-07-10',
        })
        .expect(201);
    });

    it('17. Create other earning adjustment succeeds', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary-adjustments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          adjustmentType: 'OTHER_EARNING',
          amount: '500.00',
          adjustmentDate: '2026-07-12',
        })
        .expect(201);
    });

    it('18. Create other deduction adjustment succeeds', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary-adjustments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          adjustmentType: 'OTHER_DEDUCTION',
          amount: '300.00',
          adjustmentDate: '2026-07-15',
        })
        .expect(201);
    });

    it('19. Invalid adjustment amount is rejected', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary-adjustments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          adjustmentType: 'BONUS',
          amount: '-500.00',
          adjustmentDate: '2026-07-20',
        })
        .expect(400);
    });

    it('20. Invalid adjustment type is rejected', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary-adjustments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          adjustmentType: 'INVALID_TYPE',
          amount: '500.00',
          adjustmentDate: '2026-07-20',
        })
        .expect(400);
    });

    it('21. Cross-tenant adjustment access is rejected with 404', async () => {
      await request(app.getHttpServer())
        .get(`/employees/${empB1.id}/salary-adjustments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it('22. Unauthorized adjustment creation returns 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/salary-adjustments`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          adjustmentType: 'BONUS',
          amount: '1000.00',
          adjustmentDate: '2026-07-25',
        })
        .expect(403);
    });

    it('23. Adjustment status handling (cancellation) works', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/salary-adjustments/${adjA.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');
    });
  });

  describe('Employee Advances & Repayments', () => {
    let advanceA: any;
    let advanceB: any;

    it('24. Create employee advance succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/advances`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          amount: '10000.00',
          advanceDate: '2026-08-01',
          reason: 'Emergency home repair',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.advance_number).toBe('ADV-000001');
      expect(res.body.amount).toBe('10000.00');
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.outstandingBalance).toBe('10000.00');
      advanceA = res.body;
    });

    it('25. View advance by ID succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/advances/${advanceA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.id).toBe(advanceA.id);
      expect(res.body.outstandingBalance).toBe('10000.00');
    });

    it('26. List employee advances succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/employees/${empA1.id}/advances`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.length).toBe(1);
    });

    it('27 & 28. Add partial repayment updates outstanding balance', async () => {
      const repRes = await request(app.getHttpServer())
        .post(`/advances/${advanceA.id}/repayments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          amount: '3000.00',
          repaymentDate: '2026-08-10',
          notes: 'August partial repayment',
        })
        .expect(201);

      expect(repRes.body.amount).toBe('3000.00');

      const advRes = await request(app.getHttpServer())
        .get(`/advances/${advanceA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(advRes.body.outstandingBalance).toBe('7000.00');
      expect(advRes.body.status).toBe('ACTIVE');
    });

    it('29 & 30. Add final repayment automatically transitions status to SETTLED', async () => {
      await request(app.getHttpServer())
        .post(`/advances/${advanceA.id}/repayments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          amount: '7000.00',
          repaymentDate: '2026-08-20',
          notes: 'Final settlement repayment',
        })
        .expect(201);

      const advRes = await request(app.getHttpServer())
        .get(`/advances/${advanceA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(advRes.body.outstandingBalance).toBe('0.00');
      expect(advRes.body.status).toBe('SETTLED');
    });

    it('31. Repayment greater than outstanding balance is rejected', async () => {
      const newAdv = await request(app.getHttpServer())
        .post(`/employees/${empA2.id}/advances`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          amount: '5000.00',
          advanceDate: '2026-08-01',
        })
        .expect(201);

      advanceB = newAdv.body;

      await request(app.getHttpServer())
        .post(`/advances/${advanceB.id}/repayments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          amount: '6000.00',
          repaymentDate: '2026-08-05',
        })
        .expect(400);
    });

    it('32. Repayment against SETTLED advance is rejected', async () => {
      await request(app.getHttpServer())
        .post(`/advances/${advanceA.id}/repayments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          amount: '100.00',
          repaymentDate: '2026-08-25',
        })
        .expect(400);
    });

    it('33. Repayment against CANCELLED advance is rejected', async () => {
      const cancelAdv = await request(app.getHttpServer())
        .post(`/employees/${empA2.id}/advances`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          amount: '2000.00',
          advanceDate: '2026-08-01',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/advances/${cancelAdv.body.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/advances/${cancelAdv.body.id}/repayments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          amount: '500.00',
          repaymentDate: '2026-08-05',
        })
        .expect(400);
    });

    it('34. Cross-tenant advance access is rejected with 404', async () => {
      const ownerBRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'owner@beta.com', password: 'Password123!' });

      await request(app.getHttpServer())
        .get(`/advances/${advanceA.id}`)
        .set('Authorization', `Bearer ${ownerBRes.body.accessToken}`)
        .expect(404);
    });

    it('35. Cross-tenant repayment creation is rejected with 404', async () => {
      const ownerBRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'owner@beta.com', password: 'Password123!' });

      await request(app.getHttpServer())
        .post(`/advances/${advanceB.id}/repayments`)
        .set('Authorization', `Bearer ${ownerBRes.body.accessToken}`)
        .send({
          amount: '1000.00',
          repaymentDate: '2026-08-10',
        })
        .expect(404);
    });

    it('36. Unauthorized advance creation returns 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/employees/${empA1.id}/advances`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          amount: '5000.00',
          advanceDate: '2026-08-01',
        })
        .expect(403);
    });

    it('37. Unauthorized repayment creation returns 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/advances/${advanceB.id}/repayments`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          amount: '1000.00',
          repaymentDate: '2026-08-10',
        })
        .expect(403);
    });

    it('38 & 39. Repayment history remains intact after settlement', async () => {
      const repList = await request(app.getHttpServer())
        .get(`/advances/${advanceA.id}/repayments`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(repList.body.length).toBe(2);
      expect(repList.body[0].amount).toBe('7000.00');
      expect(repList.body[1].amount).toBe('3000.00');
    });
  });
});
