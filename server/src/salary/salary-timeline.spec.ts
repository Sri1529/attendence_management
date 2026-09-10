import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module.js';
import { DataSource, IsNull } from 'typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { User, UserStatus } from '../users/entities/user.entity.js';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity.js';
import { SalaryService } from './salary.service.js';
import { EmployeeSalaryHistory } from './entities/employee-salary-history.entity.js';

describe('Salary Timeline Active Period Rules', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let salaryService: SalaryService;

  let company: Company;
  let user: User;
  let employee: Employee;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    salaryService = moduleFixture.get<SalaryService>(SalaryService);

    await dataSource.query(
      'TRUNCATE TABLE advance_repayments, employee_advances, salary_adjustments, employee_salary_history, attendance, leave_records, leave_types, employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
    );

    const companyRepo = dataSource.getRepository(Company);
    company = await companyRepo.save(
      companyRepo.create({ name: 'Timeline Corp', timezone: 'UTC', currency: 'USD' }),
    );

    const roleRepo = dataSource.getRepository(Role);
    const role = await roleRepo.save(
      roleRepo.create({ company_id: company.id, name: 'Owner', is_system: true }),
    );

    const userRepo = dataSource.getRepository(User);
    user = await userRepo.save(
      userRepo.create({
        company_id: company.id,
        role_id: role.id,
        name: 'Test Owner',
        email: 'testowner@timeline.com',
        password_hash: 'hash',
        status: UserStatus.ACTIVE,
      }),
    );

    const empRepo = dataSource.getRepository(Employee);
    employee = await empRepo.save(
      empRepo.create({
        company_id: company.id,
        employee_code: 'TL001',
        first_name: 'Timeline',
        last_name: 'User',
        joining_date: '2026-01-01',
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Create first salary -> effective_to = NULL', async () => {
    const sal1 = await salaryService.createSalary(company.id, user.id, employee.id, {
      basicSalary: '35000',
      effectiveFrom: '2026-08-01',
    });

    expect(sal1.basic_salary).toBe('35000.00');
    expect(sal1.effective_from).toBe('2026-08-01');
    expect(sal1.effective_to).toBeNull();

    const history = await salaryService.getSalaryHistory(company.id, employee.id);
    expect(history).toHaveLength(1);
    expect(history[0].effective_to).toBeNull();
  });

  it('2. Create second salary -> first.effective_to = second.effective_from - 1 day', async () => {
    await salaryService.createSalary(company.id, user.id, employee.id, {
      basicSalary: '35000',
      effectiveFrom: '2026-08-01',
    });

    const sal2 = await salaryService.createSalary(company.id, user.id, employee.id, {
      basicSalary: '40000',
      effectiveFrom: '2026-09-01',
    });

    expect(sal2.effective_from).toBe('2026-09-01');
    expect(sal2.effective_to).toBeNull();

    const history = await salaryService.getSalaryHistory(company.id, employee.id);
    expect(history).toHaveLength(2);

    // History is ordered DESC by effective_from
    const current = history[0];
    const previous = history[1];

    expect(current.effective_from).toBe('2026-09-01');
    expect(current.effective_to).toBeNull();

    expect(previous.effective_from).toBe('2026-08-01');
    expect(previous.effective_to).toBe('2026-08-31');
  });

  it('3. Create salary with same amount -> two separate historical records', async () => {
    await salaryService.createSalary(company.id, user.id, employee.id, {
      basicSalary: '35000',
      effectiveFrom: '2026-08-01',
    });

    await salaryService.createSalary(company.id, user.id, employee.id, {
      basicSalary: '35000',
      effectiveFrom: '2026-09-01',
    });

    const history = await salaryService.getSalaryHistory(company.id, employee.id);
    expect(history).toHaveLength(2);

    expect(history[0].basic_salary).toBe('35000.00');
    expect(history[0].effective_from).toBe('2026-09-01');
    expect(history[0].effective_to).toBeNull();

    expect(history[1].basic_salary).toBe('35000.00');
    expect(history[1].effective_from).toBe('2026-08-01');
    expect(history[1].effective_to).toBe('2026-08-31');
  });

  it('4. Prevent duplicate starting date (same effectiveFrom throws exception)', async () => {
    await salaryService.createSalary(company.id, user.id, employee.id, {
      basicSalary: '35000',
      effectiveFrom: '2026-08-01',
    });

    await expect(
      salaryService.createSalary(company.id, user.id, employee.id, {
        basicSalary: '38000',
        effectiveFrom: '2026-08-01',
      }),
    ).rejects.toThrow('Overlapping salary effective date');
  });

  it('5. Prevent multiple active/open-ended records in DB', async () => {
    await salaryService.createSalary(company.id, user.id, employee.id, {
      basicSalary: '30000',
      effectiveFrom: '2026-07-01',
    });

    await salaryService.createSalary(company.id, user.id, employee.id, {
      basicSalary: '35000',
      effectiveFrom: '2026-08-01',
    });

    await salaryService.createSalary(company.id, user.id, employee.id, {
      basicSalary: '40000',
      effectiveFrom: '2026-09-01',
    });

    const openRecords = await dataSource.getRepository(EmployeeSalaryHistory).find({
      where: { employee_id: employee.id, effective_to: IsNull() },
    });

    expect(openRecords).toHaveLength(1);
    expect(openRecords[0].effective_from).toBe('2026-09-01');
  });

  it('6. getCurrentSalary returns exactly one current salary record', async () => {
    await salaryService.createSalary(company.id, user.id, employee.id, {
      basicSalary: '35000',
      effectiveFrom: '2026-08-01',
    });

    await salaryService.createSalary(company.id, user.id, employee.id, {
      basicSalary: '40000',
      effectiveFrom: '2026-09-01',
    });

    const currentAug = await salaryService.getCurrentSalary(company.id, employee.id, '2026-08-15');
    expect(currentAug.basic_salary).toBe('35000.00');

    const currentSep = await salaryService.getCurrentSalary(company.id, employee.id, '2026-09-15');
    expect(currentSep.basic_salary).toBe('40000.00');
  });
});
