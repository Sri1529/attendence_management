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
import { LeaveType, LeaveTypeStatus } from '../src/leave-types/entities/leave-type.entity.js';
import { LeaveRecord, LeaveStatus } from '../src/leave-records/entities/leave-record.entity.js';
import { Attendance, AttendanceStatus } from '../src/attendance/entities/attendance.entity.js';
import { AuditLog } from '../src/audit-logs/entities/audit-log.entity.js';
import { hashPassword } from '../src/common/utils/password.util.js';

describe('Phase 4: Attendance & Basic Leave (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let companyA: Company;
  let companyB: Company;
  let roleOwnerA: Role;
  let roleMemberA: Role;

  let ownerAToken: string;
  let memberAToken: string;
  let noPermToken: string;

  let empA1: Employee;
  let empA2: Employee;
  let empTerminated: Employee;
  let empB1: Employee;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    await dataSource.query(
      'TRUNCATE TABLE attendance, leave_records, leave_types, employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
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
    const emptyRole = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'Empty Role', is_system: false }),
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

    const attView = (await permRepo.findOneBy({ code: 'ATTENDANCE_VIEW' }))!;
    const leaveView = (await permRepo.findOneBy({ code: 'LEAVE_VIEW' }))!;
    await rolePermRepo.save(
      rolePermRepo.create({ role_id: roleMemberA.id, permission_id: attView.id }),
    );
    await rolePermRepo.save(
      rolePermRepo.create({ role_id: roleMemberA.id, permission_id: leaveView.id }),
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

    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: emptyRole.id,
        name: 'No Perm User',
        email: 'noperm@alpha.com',
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
    empTerminated = await empRepo.save(
      empRepo.create({
        company_id: companyA.id,
        employee_code: 'EMP003',
        first_name: 'Term',
        last_name: 'User',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.TERMINATED,
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
      .send({ email: 'noperm@alpha.com', password: 'Password123!' });
    noPermToken = resNoPerm.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Leave Types Module', () => {
    let leaveTypeA: any;

    it('19. Create leave type succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post('/leave-types')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Casual Leave', description: 'Paid annual casual leave' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Casual Leave');
      leaveTypeA = res.body;
    });

    it('20. List leave types succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get('/leave-types')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('21. Get leave type by ID succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/leave-types/${leaveTypeA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.id).toBe(leaveTypeA.id);
    });

    it('22. Update leave type succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/leave-types/${leaveTypeA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ description: 'Updated Casual Leave' })
        .expect(200);

      expect(res.body.description).toBe('Updated Casual Leave');
    });

    it('23. Deactivate leave type succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/leave-types/${leaveTypeA.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');

      await request(app.getHttpServer())
        .patch(`/leave-types/${leaveTypeA.id}/status`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'ACTIVE' });
    });

    it('24. Duplicate leave type name within company is rejected', async () => {
      await request(app.getHttpServer())
        .post('/leave-types')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Casual Leave' })
        .expect(400);
    });

    it('25. Cross-tenant leave type access is rejected with 404', async () => {
      const ltRepo = dataSource.getRepository(LeaveType);
      const ltB = await ltRepo.save(
        ltRepo.create({ company_id: companyB.id, name: 'Sick Leave' }),
      );

      await request(app.getHttpServer())
        .get(`/leave-types/${ltB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it('26. User without LEAVE_CREATE receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/leave-types')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ name: 'Forbidden Leave Type' })
        .expect(403);
    });
  });

  describe('Leave Records Module', () => {
    let activeLeaveType: LeaveType;
    let inactiveLeaveType: LeaveType;
    let leaveTypeB: LeaveType;
    let leaveRecordA: any;

    beforeAll(async () => {
      const ltRepo = dataSource.getRepository(LeaveType);
      activeLeaveType = await ltRepo.save(
        ltRepo.create({ company_id: companyA.id, name: 'Sick Leave', status: LeaveTypeStatus.ACTIVE }),
      );
      inactiveLeaveType = await ltRepo.save(
        ltRepo.create({ company_id: companyA.id, name: 'Old Leave', status: LeaveTypeStatus.INACTIVE }),
      );
      leaveTypeB = await ltRepo.save(
        ltRepo.create({ company_id: companyB.id, name: 'Beta Leave', status: LeaveTypeStatus.ACTIVE }),
      );
    });

    it('27. Create leave record succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post('/leave-records')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA1.id,
          leaveTypeId: activeLeaveType.id,
          startDate: '2026-09-10',
          endDate: '2026-09-12',
          remarks: 'Medical leave',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('PENDING');
      leaveRecordA = res.body;
    });

    it('28. Get leave record by ID succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/leave-records/${leaveRecordA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.id).toBe(leaveRecordA.id);
    });

    it('29. Update leave record succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/leave-records/${leaveRecordA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ remarks: 'Updated medical notes' })
        .expect(200);

      expect(res.body.remarks).toBe('Updated medical notes');
    });

    it('30. List leave records succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get('/leave-records')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('31. Filter leave records by employee succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/leave-records?employeeId=${empA1.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });

    it('32. Filter leave records by status succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get('/leave-records?status=PENDING')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('33. Invalid date range (end before start) is rejected', async () => {
      await request(app.getHttpServer())
        .post('/leave-records')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA1.id,
          leaveTypeId: activeLeaveType.id,
          startDate: '2026-09-15',
          endDate: '2026-09-10',
        })
        .expect(400);
    });

    it('34. Cross-tenant employee leave creation is rejected', async () => {
      await request(app.getHttpServer())
        .post('/leave-records')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empB1.id,
          leaveTypeId: activeLeaveType.id,
          startDate: '2026-09-20',
          endDate: '2026-09-21',
        })
        .expect(404);
    });

    it('35. Cross-tenant leave type is rejected', async () => {
      await request(app.getHttpServer())
        .post('/leave-records')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA1.id,
          leaveTypeId: leaveTypeB.id,
          startDate: '2026-09-20',
          endDate: '2026-09-21',
        })
        .expect(400);
    });

    it('36. Inactive leave type for new leave is rejected', async () => {
      await request(app.getHttpServer())
        .post('/leave-records')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA1.id,
          leaveTypeId: inactiveLeaveType.id,
          startDate: '2026-09-20',
          endDate: '2026-09-21',
        })
        .expect(400);
    });

    it('37. Overlapping leave request is rejected', async () => {
      await request(app.getHttpServer())
        .post('/leave-records')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA1.id,
          leaveTypeId: activeLeaveType.id,
          startDate: '2026-09-11',
          endDate: '2026-09-13',
        })
        .expect(400);
    });

    it('38. Rejected or cancelled leave does not block future leave', async () => {
      const rejectRes = await request(app.getHttpServer())
        .post('/leave-records')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA2.id,
          leaveTypeId: activeLeaveType.id,
          startDate: '2026-10-01',
          endDate: '2026-10-05',
          status: 'REJECTED',
        })
        .expect(201);

      expect(rejectRes.body.status).toBe('REJECTED');

      await request(app.getHttpServer())
        .post('/leave-records')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA2.id,
          leaveTypeId: activeLeaveType.id,
          startDate: '2026-10-02',
          endDate: '2026-10-04',
        })
        .expect(201);
    });

    it('39. User without LEAVE_CREATE receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/leave-records')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          employeeId: empA1.id,
          leaveTypeId: activeLeaveType.id,
          startDate: '2026-11-01',
          endDate: '2026-11-02',
        })
        .expect(403);
    });

    it('40. User without LEAVE_VIEW receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/leave-records')
        .set('Authorization', `Bearer ${noPermToken}`)
        .expect(403);
    });
  });

  describe('Attendance Module & Consistency', () => {
    let attendanceA: any;

    it('1. Create attendance succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post('/attendance')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA1.id,
          attendanceDate: '2026-09-01',
          status: 'PRESENT',
          remarks: 'On time',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('PRESENT');
      attendanceA = res.body;
    });

    it('2. Get attendance by ID succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/attendance/${attendanceA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.id).toBe(attendanceA.id);
    });

    it('3. Update attendance succeeds', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/attendance/${attendanceA.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ remarks: 'Updated notes' })
        .expect(200);

      expect(res.body.remarks).toBe('Updated notes');
    });

    it('4. List attendance succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get('/attendance')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('5. Filter attendance by employee succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get(`/attendance?employeeId=${empA1.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });

    it('6. Filter attendance by date range succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get('/attendance?startDate=2026-09-01&endDate=2026-09-05')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('7. Filter attendance by status succeeds', async () => {
      const res = await request(app.getHttpServer())
        .get('/attendance?status=PRESENT')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('8. Attendance pagination works', async () => {
      const res = await request(app.getHttpServer())
        .get('/attendance?page=1&limit=5')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(5);
    });

    it('9. Duplicate employee/date attendance is rejected', async () => {
      await request(app.getHttpServer())
        .post('/attendance')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA1.id,
          attendanceDate: '2026-09-01',
          status: 'PRESENT',
        })
        .expect(400);
    });

    it('10. Cross-tenant employee attendance creation is rejected with 404', async () => {
      await request(app.getHttpServer())
        .post('/attendance')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empB1.id,
          attendanceDate: '2026-09-02',
          status: 'PRESENT',
        })
        .expect(404);
    });

    it('11. Cross-tenant attendance access is rejected with 404', async () => {
      const attRepo = dataSource.getRepository(Attendance);
      const attB = await attRepo.save(
        attRepo.create({
          company_id: companyB.id,
          employee_id: empB1.id,
          attendance_date: '2026-09-02',
          status: AttendanceStatus.PRESENT,
        }),
      );

      await request(app.getHttpServer())
        .get(`/attendance/${attB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it('12. User without ATTENDANCE_CREATE receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/attendance')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          employeeId: empA1.id,
          attendanceDate: '2026-09-03',
          status: 'PRESENT',
        })
        .expect(403);
    });

    it('13. User without ATTENDANCE_VIEW receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/attendance')
        .set('Authorization', `Bearer ${noPermToken}`)
        .expect(403);
    });

    it('14. Invalid attendance status is rejected', async () => {
      await request(app.getHttpServer())
        .post('/attendance')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA1.id,
          attendanceDate: '2026-09-04',
          status: 'INVALID_STATUS',
        })
        .expect(400);
    });

    it('15. Attendance for terminated employee is rejected', async () => {
      await request(app.getHttpServer())
        .post('/attendance')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empTerminated.id,
          attendanceDate: '2026-09-05',
          status: 'PRESENT',
        })
        .expect(400);
    });

    it('16. Bulk attendance succeeds', async () => {
      const res = await request(app.getHttpServer())
        .post('/attendance/bulk')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          attendanceDate: '2026-09-06',
          records: [
            { employeeId: empA1.id, status: 'PRESENT' },
            { employeeId: empA2.id, status: 'ABSENT' },
          ],
        })
        .expect(201);

      expect(res.body.count).toBe(2);
    });

    it('17. Bulk attendance is transactional (rollback on error)', async () => {
      await request(app.getHttpServer())
        .post('/attendance/bulk')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          attendanceDate: '2026-09-07',
          records: [
            { employeeId: empA1.id, status: 'PRESENT' },
            { employeeId: '00000000-0000-0000-0000-000000000000', status: 'ABSENT' },
          ],
        })
        .expect(400);

      const attRepo = dataSource.getRepository(Attendance);
      const att = await attRepo.findOneBy({
        company_id: companyA.id,
        employee_id: empA1.id,
        attendance_date: '2026-09-07',
      });
      expect(att).toBeNull();
    });

    it('18. Duplicate employee IDs in bulk request is rejected', async () => {
      await request(app.getHttpServer())
        .post('/attendance/bulk')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          attendanceDate: '2026-09-08',
          records: [
            { employeeId: empA1.id, status: 'PRESENT' },
            { employeeId: empA1.id, status: 'ABSENT' },
          ],
        })
        .expect(400);
    });

    it('19. Attendance operations generate audit logs', async () => {
      const auditRepo = dataSource.getRepository(AuditLog);
      const logs = await auditRepo.find({
        where: { company_id: companyA.id },
        order: { created_at: 'DESC' },
      });
      const attendanceLogs = logs.filter((l) => l.entity_type === 'ATTENDANCE');
      expect(attendanceLogs.length).toBeGreaterThan(0);
    });

    it('Consistency Test: Approved leave prevents conflicting PRESENT/ABSENT/HALF_DAY attendance', async () => {
      const ltRepo = dataSource.getRepository(LeaveType);
      const lt = await ltRepo.save(
        ltRepo.create({ company_id: companyA.id, name: 'Vacation' }),
      );

      const lrRepo = dataSource.getRepository(LeaveRecord);
      await lrRepo.save(
        lrRepo.create({
          company_id: companyA.id,
          employee_id: empA1.id,
          leave_type_id: lt.id,
          start_date: '2026-12-01',
          end_date: '2026-12-05',
          status: LeaveStatus.APPROVED,
        }),
      );

      await request(app.getHttpServer())
        .post('/attendance')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA1.id,
          attendanceDate: '2026-12-02',
          status: 'PRESENT',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/attendance')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          employeeId: empA1.id,
          attendanceDate: '2026-12-02',
          status: 'LEAVE',
        })
        .expect(201);
    });

    describe('Approved Leave -> Attendance Automatic Synchronization Suite', () => {
      let syncLeaveType: LeaveType;

      beforeAll(async () => {
        const ltRepo = dataSource.getRepository(LeaveType);
        syncLeaveType = await ltRepo.save(
          ltRepo.create({ company_id: companyA.id, name: 'Sick Leave Sync', status: LeaveTypeStatus.ACTIVE }),
        );
      });

      it('TEST 1: Single-day leave approval creates LEAVE attendance', async () => {
        const createRes = await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-10',
            endDate: '2026-10-10',
            status: 'PENDING',
          })
          .expect(201);

        const leaveId = createRes.body.id;

        await request(app.getHttpServer())
          .patch(`/leave-records/${leaveId}/status`)
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({ status: 'APPROVED' })
          .expect(200);

        const attRepo = dataSource.getRepository(Attendance);
        const att = await attRepo.findOneBy({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-10',
        });
        expect(att).toBeDefined();
        expect(att?.status).toBe('LEAVE');
      });

      it('TEST 2: Multi-day leave approval creates LEAVE attendance for all dates', async () => {
        const createRes = await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA2.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-12',
            endDate: '2026-10-14',
            status: 'APPROVED',
          })
          .expect(201);

        expect(createRes.body.status).toBe('APPROVED');

        const attRepo = dataSource.getRepository(Attendance);
        for (const date of ['2026-10-12', '2026-10-13', '2026-10-14']) {
          const att = await attRepo.findOneBy({
            company_id: companyA.id,
            employee_id: empA2.id,
            attendance_date: date,
          });
          expect(att).toBeDefined();
          expect(att?.status).toBe('LEAVE');
        }
      });

      it('TEST 3: Approve leave where attendance is ABSENT updates it to LEAVE', async () => {
        const attRepo = dataSource.getRepository(Attendance);
        await attRepo.save(
          attRepo.create({
            company_id: companyA.id,
            employee_id: empA1.id,
            attendance_date: '2026-10-15',
            status: AttendanceStatus.ABSENT,
          }),
        );

        await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-15',
            endDate: '2026-10-15',
            status: 'APPROVED',
          })
          .expect(201);

        const att = await attRepo.findOneBy({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-15',
        });
        expect(att?.status).toBe('LEAVE');
        expect(att?.remarks).toContain('was ABSENT');
      });

      it('TEST 4: Approve leave where attendance is already LEAVE does not duplicate', async () => {
        const attRepo = dataSource.getRepository(Attendance);
        await attRepo.save(
          attRepo.create({
            company_id: companyA.id,
            employee_id: empA1.id,
            attendance_date: '2026-10-16',
            status: AttendanceStatus.LEAVE,
          }),
        );

        await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-16',
            endDate: '2026-10-16',
            status: 'APPROVED',
          })
          .expect(201);

        const atts = await attRepo.findBy({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-16',
        });
        expect(atts.length).toBe(1);
      });

      it('TEST 5: Approve leave where attendance is PRESENT fails with conflict error', async () => {
        const attRepo = dataSource.getRepository(Attendance);
        await attRepo.save(
          attRepo.create({
            company_id: companyA.id,
            employee_id: empA1.id,
            attendance_date: '2026-10-17',
            status: AttendanceStatus.PRESENT,
          }),
        );

        await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-17',
            endDate: '2026-10-17',
            status: 'APPROVED',
          })
          .expect(400);

        const att = await attRepo.findOneBy({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-17',
        });
        expect(att?.status).toBe('PRESENT');
      });

      it('TEST 6: Approve leave where attendance is HALF_DAY fails with conflict error', async () => {
        const attRepo = dataSource.getRepository(Attendance);
        await attRepo.save(
          attRepo.create({
            company_id: companyA.id,
            employee_id: empA1.id,
            attendance_date: '2026-10-18',
            status: AttendanceStatus.HALF_DAY,
          }),
        );

        await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-18',
            endDate: '2026-10-18',
            status: 'APPROVED',
          })
          .expect(400);
      });

      it('TEST 7: Reject leave does not create LEAVE attendance', async () => {
        await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-19',
            endDate: '2026-10-19',
            status: 'REJECTED',
          })
          .expect(201);

        const attRepo = dataSource.getRepository(Attendance);
        const att = await attRepo.findOneBy({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-19',
        });
        expect(att).toBeNull();
      });

      it('TEST 8: Cancel approved leave reconciles attendance', async () => {
        const createRes = await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-20',
            endDate: '2026-10-20',
            status: 'APPROVED',
          })
          .expect(201);

        const leaveId = createRes.body.id;

        await request(app.getHttpServer())
          .patch(`/leave-records/${leaveId}/status`)
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({ status: 'CANCELLED' })
          .expect(200);

        const attRepo = dataSource.getRepository(Attendance);
        const att = await attRepo.findOneBy({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-20',
        });
        expect(att).toBeNull();
      });

      it('TEST 9: Repeat approval/synchronization is idempotent', async () => {
        const createRes = await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-21',
            endDate: '2026-10-21',
            status: 'APPROVED',
          })
          .expect(201);

        const leaveId = createRes.body.id;

        await request(app.getHttpServer())
          .patch(`/leave-records/${leaveId}/status`)
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({ status: 'APPROVED' })
          .expect(200);

        const attRepo = dataSource.getRepository(Attendance);
        const atts = await attRepo.findBy({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-21',
        });
        expect(atts.length).toBe(1);
        expect(atts[0].status).toBe('LEAVE');
      });

      it('TEST 10: Tenant isolation prevents cross-company attendance sync', async () => {
        const attRepo = dataSource.getRepository(Attendance);
        const attB = await attRepo.findOneBy({
          company_id: companyB.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-10',
        });
        expect(attB).toBeNull();
      });

      it('TEST 11: Transaction rollback on attendance conflict leaves LeaveRecord unapproved', async () => {
        const attRepo = dataSource.getRepository(Attendance);
        await attRepo.save(
          attRepo.create({
            company_id: companyA.id,
            employee_id: empA1.id,
            attendance_date: '2026-10-22',
            status: AttendanceStatus.PRESENT,
          }),
        );

        const createRes = await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-22',
            endDate: '2026-10-22',
            status: 'PENDING',
          })
          .expect(201);

        const leaveId = createRes.body.id;

        await request(app.getHttpServer())
          .patch(`/leave-records/${leaveId}/status`)
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({ status: 'APPROVED' })
          .expect(400);

        const lrRepo = dataSource.getRepository(LeaveRecord);
        const lr = await lrRepo.findOneBy({ id: leaveId });
        expect(lr?.status).toBe('PENDING');
      });

      it('TEST 12: Date boundary multi-day leave across month boundary preserves date accuracy', async () => {
        await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA2.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-31',
            endDate: '2026-11-02',
            status: 'APPROVED',
          })
          .expect(201);

        const attRepo = dataSource.getRepository(Attendance);
        for (const date of ['2026-10-31', '2026-11-01', '2026-11-02']) {
          const att = await attRepo.findOneBy({
            company_id: companyA.id,
            employee_id: empA2.id,
            attendance_date: date,
          });
          expect(att).toBeDefined();
          expect(att?.status).toBe('LEAVE');
        }
      });

      it('TEST 13: Existing HOLIDAY attendance is preserved during leave approval', async () => {
        const attRepo = dataSource.getRepository(Attendance);
        await attRepo.save(
          attRepo.create({
            company_id: companyA.id,
            employee_id: empA1.id,
            attendance_date: '2026-10-25',
            status: AttendanceStatus.HOLIDAY,
          }),
        );

        await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-10-25',
            endDate: '2026-10-25',
            status: 'APPROVED',
          })
          .expect(201);

        const att = await attRepo.findOneBy({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-10-25',
        });
        expect(att?.status).toBe('HOLIDAY');
      });

      it('TEST 14: Direct PATCH /attendance/:id on leave-linked attendance is rejected with 409 Conflict', async () => {
        await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-11-10',
            endDate: '2026-11-10',
            status: 'APPROVED',
          })
          .expect(201);

        const attRepo = dataSource.getRepository(Attendance);
        const att = await attRepo.findOneBy({
          company_id: companyA.id,
          employee_id: empA1.id,
          attendance_date: '2026-11-10',
        });
        expect(att).toBeDefined();

        const patchRes = await request(app.getHttpServer())
          .patch(`/attendance/${att!.id}`)
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({ status: 'PRESENT' })
          .expect(409);

        expect(patchRes.body.message).toContain('linked to an approved leave');
      });

      it('TEST 15: Bulk attendance update on leave-linked attendance is rejected with 409 Conflict', async () => {
        await request(app.getHttpServer())
          .post('/leave-records')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            employeeId: empA1.id,
            leaveTypeId: syncLeaveType.id,
            startDate: '2026-11-15',
            endDate: '2026-11-15',
            status: 'APPROVED',
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/attendance/bulk')
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({
            attendanceDate: '2026-11-15',
            records: [{ employeeId: empA1.id, status: 'PRESENT' }],
          })
          .expect(409);
      });
    });
  });
});
