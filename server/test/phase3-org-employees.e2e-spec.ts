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
import { Department, DepartmentStatus } from '../src/departments/entities/department.entity.js';
import { Designation, DesignationStatus } from '../src/designations/entities/designation.entity.js';
import { Employee } from '../src/employees/entities/employee.entity.js';
import { hashPassword } from '../src/common/utils/password.util.js';

describe('Phase 3: Organization & Employees (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let companyA: Company;
  let companyB: Company;
  let roleOwnerA: Role;
  let roleMemberA: Role;

  let ownerAToken: string;
  let memberAToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    await dataSource.query(
      'TRUNCATE TABLE employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
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

    const deptView = (await permRepo.findOneBy({ code: 'DEPARTMENT_VIEW' }))!;
    const empView = (await permRepo.findOneBy({ code: 'EMPLOYEE_VIEW' }))!;
    await rolePermRepo.save(
      rolePermRepo.create({ role_id: roleMemberA.id, permission_id: deptView.id }),
    );
    await rolePermRepo.save(
      rolePermRepo.create({ role_id: roleMemberA.id, permission_id: empView.id }),
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
        company_id: companyB.id,
        role_id: roleOwnerB.id,
        name: 'Owner B',
        email: 'owner@beta.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Departments Module', () => {
    let deptA: any;

    it('1. Create department succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post('/departments')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Engineering', description: 'Tech team' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Engineering');
      deptA = res.body;
    });

    it('2. List departments succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get('/departments')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('3. Get department by ID succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/departments/${deptA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.id).toBe(deptA.id);
    });

    it('4. Update department succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/departments/${deptA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ description: 'Updated Tech Team' })
        .expect(200);

      expect(res.body.description).toBe('Updated Tech Team');
    });

    it('5. Deactivate department succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/departments/${deptA.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');

      await request(app.getHttpServer())
        .patch(`/departments/${deptA.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'ACTIVE' });
    });

    it('6. Duplicate department name within company is rejected', async () => {
      await request(app.getHttpServer())
        .post('/departments')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Engineering' })
        .expect(400);
    });

    it('7. Cross-tenant department access is rejected with 404', async () => {
      const deptRepo = dataSource.getRepository(Department);
      const deptB = await deptRepo.save(
        deptRepo.create({ company_id: companyB.id, name: 'Engineering' }),
      );

      await request(app.getHttpServer())
        .get(`/departments/${deptB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });
  });

  describe('Designations Module', () => {
    let desgA: any;

    it('8. Create designation succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post('/designations')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Software Engineer', description: 'Writes code' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Software Engineer');
      desgA = res.body;
    });

    it('9. List designations succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get('/designations')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('10. Get designation by ID succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/designations/${desgA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.id).toBe(desgA.id);
    });

    it('11. Update designation succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/designations/${desgA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ description: 'Senior dev' })
        .expect(200);

      expect(res.body.description).toBe('Senior dev');
    });

    it('12. Deactivate designation succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/designations/${desgA.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');

      await request(app.getHttpServer())
        .patch(`/designations/${desgA.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'ACTIVE' });
    });

    it('13. Duplicate designation name within company is rejected', async () => {
      await request(app.getHttpServer())
        .post('/designations')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Software Engineer' })
        .expect(400);
    });

    it('14. Cross-tenant designation access is rejected with 404', async () => {
      const desgRepo = dataSource.getRepository(Designation);
      const desgB = await desgRepo.save(
        desgRepo.create({ company_id: companyB.id, name: 'Software Engineer' }),
      );

      await request(app.getHttpServer())
        .get(`/designations/${desgB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });
  });

  describe('Employees Module', () => {
    let activeDept: Department;
    let inactiveDept: Department;
    let activeDesg: Designation;
    let inactiveDesg: Designation;
    let deptB: Department;
    let desgB: Designation;
    let employeeA: any;

    beforeAll(async () => {
      const deptRepo = dataSource.getRepository(Department);
      activeDept = await deptRepo.save(
        deptRepo.create({ company_id: companyA.id, name: 'Product', status: DepartmentStatus.ACTIVE }),
      );
      inactiveDept = await deptRepo.save(
        deptRepo.create({ company_id: companyA.id, name: 'Old Sales', status: DepartmentStatus.INACTIVE }),
      );
      deptB = await deptRepo.save(
        deptRepo.create({ company_id: companyB.id, name: 'Marketing', status: DepartmentStatus.ACTIVE }),
      );

      const desgRepo = dataSource.getRepository(Designation);
      activeDesg = await desgRepo.save(
        desgRepo.create({ company_id: companyA.id, name: 'Product Manager', status: DesignationStatus.ACTIVE }),
      );
      inactiveDesg = await desgRepo.save(
        desgRepo.create({ company_id: companyA.id, name: 'Old Lead', status: DesignationStatus.INACTIVE }),
      );
      desgB = await desgRepo.save(
        desgRepo.create({ company_id: companyB.id, name: 'CMO', status: DesignationStatus.ACTIVE }),
      );
    });

    it('15. Create employee succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeCode: 'EMP001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@alpha.com',
          phone: '1234567890',
          joiningDate: '2026-01-15',
          departmentId: activeDept.id,
          designationId: activeDesg.id,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.employee_code).toBe('EMP001');
      employeeA = res.body;
    });

    it('16. Get employee by ID succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/employees/${employeeA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.id).toBe(employeeA.id);
    });

    it('17. Update employee succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/employees/${employeeA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ firstName: 'Johnny' })
        .expect(200);

      expect(res.body.first_name).toBe('Johnny');
    });

    it('18. Deactivate employee succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/employees/${employeeA.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ employmentStatus: 'INACTIVE' })
        .expect(200);

      expect(res.body.employment_status).toBe('INACTIVE');
    });

    it('19. Duplicate employee code within company is rejected', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeCode: 'EMP001',
          firstName: 'Jane',
          lastName: 'Smith',
          joiningDate: '2026-02-01',
        })
        .expect(400);
    });

    it('20. Cross-tenant employee access is rejected with 404', async () => {
      const empRepo = dataSource.getRepository(Employee);
      const empB = await empRepo.save(
        empRepo.create({
          company_id: companyB.id,
          employee_code: 'EMP001',
          first_name: 'Bob',
          last_name: 'Beta',
          joining_date: '2026-01-01',
        }),
      );

      await request(app.getHttpServer())
        .get(`/employees/${empB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it('21. Cross-tenant department assignment is rejected', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeCode: 'EMP002',
          firstName: 'Alice',
          lastName: 'Wonder',
          joiningDate: '2026-01-01',
          departmentId: deptB.id,
        })
        .expect(400);
    });

    it('22. Cross-tenant designation assignment is rejected', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeCode: 'EMP002',
          firstName: 'Alice',
          lastName: 'Wonder',
          joiningDate: '2026-01-01',
          designationId: desgB.id,
        })
        .expect(400);
    });

    it('23. Inactive department assignment is rejected', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeCode: 'EMP002',
          firstName: 'Alice',
          lastName: 'Wonder',
          joiningDate: '2026-01-01',
          departmentId: inactiveDept.id,
        })
        .expect(400);
    });

    it('24. Inactive designation assignment is rejected', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeCode: 'EMP002',
          firstName: 'Alice',
          lastName: 'Wonder',
          joiningDate: '2026-01-01',
          designationId: inactiveDesg.id,
        })
        .expect(400);
    });

    it('25. Employee search works', async () => {
      const res = await request(app.getHttpServer())
        .get('/employees?search=Johnny')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].first_name).toBe('Johnny');
    });

    it('26. Employee pagination works', async () => {
      const res = await request(app.getHttpServer())
        .get('/employees?page=1&limit=10')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
    });

    it('27. Employee filtering works', async () => {
      const res = await request(app.getHttpServer())
        .get(`/employees?departmentId=${activeDept.id}&employmentStatus=INACTIVE`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });
  });

  describe('RBAC Authorization', () => {
    it('28. User without EMPLOYEE_CREATE receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          employeeCode: 'EMP999',
          firstName: 'NoPerm',
          lastName: 'User',
          joiningDate: '2026-01-01',
        })
        .expect(403);
    });

    it('29. User without EMPLOYEE_VIEW receives 403 Forbidden', async () => {
      const noPermToken = await getNoPermToken(app, dataSource, companyA.id);
      await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${noPermToken}`)
        .expect(403);
    });

    it('30. User without DEPARTMENT_CREATE receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/departments')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ name: 'Forbidden Dept' })
        .expect(403);
    });

    it('31. User without DESIGNATION_CREATE receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/designations')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ name: 'Forbidden Desg' })
        .expect(403);
    });
  });
});

async function getNoPermToken(app: INestApplication, dataSource: DataSource, companyId: string) {
  const roleRepo = dataSource.getRepository(Role);
  const emptyRole = await roleRepo.save(
    roleRepo.create({ company_id: companyId, name: 'Empty Role', is_system: false }),
  );

  const userRepo = dataSource.getRepository(User);
  await userRepo.save(
    userRepo.create({
      company_id: companyId,
      role_id: emptyRole.id,
      name: 'No Perm User',
      email: 'noperm@alpha.com',
      password_hash: await hashPassword('Password123!'),
      status: UserStatus.ACTIVE,
    }),
  );

  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'noperm@alpha.com', password: 'Password123!' });

  return loginRes.body.accessToken;
}
