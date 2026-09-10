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
import { hashPassword } from '../src/common/utils/password.util.js';

describe('Phase 2: Authentication, Users, RBAC & Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let companyA: Company;
  let companyB: Company;
  let roleOwnerA: Role;
  let roleMemberA: Role;
  let roleOwnerB: Role;
  let userOwnerA: User;
  let userMemberA: User;
  let userOwnerB: User;

  let ownerAToken: string;
  let memberAToken: string;
  let ownerARefreshToken: string;

  let permissionUserCreate: Permission;
  let permissionUserView: Permission;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    await dataSource.query('TRUNCATE TABLE role_permissions, users, roles, companies CASCADE;');

    const companyRepo = dataSource.getRepository(Company);
    companyA = await companyRepo.save(
      companyRepo.create({ name: 'Acme Corp', timezone: 'UTC', currency: 'USD' }),
    );
    companyB = await companyRepo.save(
      companyRepo.create({ name: 'Beta Ltd', timezone: 'UTC', currency: 'USD' }),
    );

    const permRepo = dataSource.getRepository(Permission);
    permissionUserCreate = (await permRepo.findOneBy({ code: 'USER_CREATE' }))!;
    permissionUserView = (await permRepo.findOneBy({ code: 'USER_VIEW' }))!;

    const roleRepo = dataSource.getRepository(Role);
    roleOwnerA = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'Company Owner', is_system: true }),
    );
    roleMemberA = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'Basic Member', is_system: false }),
    );
    roleOwnerB = await roleRepo.save(
      roleRepo.create({ company_id: companyB.id, name: 'Company Owner', is_system: true }),
    );

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

    await rolePermRepo.save(
      rolePermRepo.create({ role_id: roleMemberA.id, permission_id: permissionUserView.id }),
    );

    const userRepo = dataSource.getRepository(User);
    const pwdHash = await hashPassword('Password123!');

    userOwnerA = await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: roleOwnerA.id,
        name: 'Owner A',
        email: 'owner@acme.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    userMemberA = await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: roleMemberA.id,
        name: 'Member A',
        email: 'member@acme.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    userOwnerB = await userRepo.save(
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
      .send({ email: 'owner@acme.com', password: 'Password123!' });
    ownerAToken = resA.body.accessToken;
    ownerARefreshToken = resA.body.refreshToken;

    const resMember = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'member@acme.com', password: 'Password123!' });
    memberAToken = resMember.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Authentication Module', () => {
    it('1. Valid login succeeds and returns user info + tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'owner@acme.com', password: 'Password123!' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toHaveProperty('id', userOwnerA.id);
      expect(res.body.user).not.toHaveProperty('password_hash');
      expect(res.body.user).not.toHaveProperty('refresh_token_hash');

      ownerAToken = res.body.accessToken;
      ownerARefreshToken = res.body.refreshToken;
    });

    it('2. Invalid password fails with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'owner@acme.com', password: 'WrongPassword!' })
        .expect(401);
    });

    it('3. Unknown email fails with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@acme.com', password: 'Password123!' })
        .expect(401);
    });

    it('4. Inactive user cannot login', async () => {
      const userRepo = dataSource.getRepository(User);
      const inactiveUser = await userRepo.save(
        userRepo.create({
          company_id: companyA.id,
          role_id: roleMemberA.id,
          name: 'Inactive User',
          email: 'inactive@acme.com',
          password_hash: await hashPassword('Password123!'),
          status: UserStatus.INACTIVE,
        }),
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'inactive@acme.com', password: 'Password123!' })
        .expect(401);

      await userRepo.remove(inactiveUser);
    });

    it('5. Refresh token works and returns new access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: ownerARefreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      ownerARefreshToken = res.body.refreshToken;
    });

    it('6. Refresh token rotation works and old refresh token is invalidated', async () => {
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: ownerARefreshToken })
        .expect(200);

      const newRefreshToken = refreshRes.body.refreshToken;

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: ownerARefreshToken })
        .expect(401);

      ownerARefreshToken = newRefreshToken;
    });

    it('7. Logout invalidates refresh token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'owner@acme.com', password: 'Password123!' });

      const logoutToken = loginRes.body.accessToken;
      const logoutRefreshToken = loginRes.body.refreshToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${logoutToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: logoutRefreshToken })
        .expect(401);
    });

    it('8. Invalid refresh token fails with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid.jwt.token' })
        .expect(401);
    });
  });

  describe('RBAC & Permissions', () => {
    it('9. User with required permission succeeds', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);
    });

    it('10. User without permission receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          name: 'Unauthorized User',
          email: 'unauth@acme.com',
          password: 'Password123!',
          roleId: roleMemberA.id,
        })
        .expect(403);
    });

    it('11. Role permissions are correctly resolved', async () => {
      const res = await request(app.getHttpServer())
        .get(`/roles/${roleOwnerA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('permissions');
      expect(Array.isArray(res.body.permissions)).toBe(true);
      expect(res.body.permissions.length).toBeGreaterThan(0);
    });

    it('12. Duplicate role-permission assignment is prevented', async () => {
      const roleRepo = dataSource.getRepository(Role);
      const testRole = await roleRepo.save(
        roleRepo.create({ company_id: companyA.id, name: 'Dup Perm Role' }),
      );

      const assignRes = await request(app.getHttpServer())
        .patch(`/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          permissionIds: [permissionUserView.id, permissionUserView.id],
        })
        .expect(200);

      expect(assignRes.body.permissions.length).toBe(1);
    });
  });

  describe('Tenant Isolation', () => {
    it('13. Company A cannot access Company B user', async () => {
      await request(app.getHttpServer())
        .get(`/users/${userOwnerB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it('14. Company A cannot access Company B role', async () => {
      await request(app.getHttpServer())
        .get(`/roles/${roleOwnerB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it('15. Company A cannot modify Company B role', async () => {
      await request(app.getHttpServer())
        .patch(`/roles/${roleOwnerB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Hacked Role' })
        .expect(404);
    });

    it('16. Company A cannot assign Company B role to Company A user', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          name: 'Cross Tenant User',
          email: 'cross@acme.com',
          password: 'Password123!',
          roleId: roleOwnerB.id,
        })
        .expect(400);
    });
  });

  describe('User Management', () => {
    it('17. User creation works', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          name: 'New Employee',
          email: 'newemp@acme.com',
          password: 'Password123!',
          roleId: roleMemberA.id,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('newemp@acme.com');
    });

    it('18. User password_hash is never returned in API responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      for (const u of res.body) {
        expect(u).not.toHaveProperty('password_hash');
        expect(u).not.toHaveProperty('refresh_token_hash');
      }
    });

    it('19. Duplicate email creation is prevented', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          name: 'Duplicate Email',
          email: 'owner@acme.com',
          password: 'Password123!',
          roleId: roleMemberA.id,
        })
        .expect(400);
    });

    it('20. Inactive user cannot authenticate after deactivation', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${userMemberA.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'member@acme.com', password: 'Password123!' })
        .expect(401);

      await request(app.getHttpServer())
        .patch(`/users/${userMemberA.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);
    });
  });

  describe('Role Management', () => {
    let customRole: any;

    it('21. Role creation works', async () => {
      const res = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          name: 'Attendance Officer',
          description: 'Manages employee attendance',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Attendance Officer');
      customRole = res.body;
    });

    it('22. Role update works', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/roles/${customRole.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ description: 'Updated description' })
        .expect(200);

      expect(res.body.description).toBe('Updated description');
    });

    it('23. Role status change works', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/roles/${customRole.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');
    });

    it('24. Permission assignment works', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/roles/${customRole.id}/permissions`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ permissionIds: [permissionUserCreate.id] })
        .expect(200);

      expect(res.body.permissions.some((p: any) => p.id === permissionUserCreate.id)).toBe(true);
    });
  });

  describe('Company Owner Safety', () => {
    it('25. Last Company Owner cannot be accidentally deactivated', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${userOwnerA.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'INACTIVE' })
        .expect(403);
    });
  });
});
