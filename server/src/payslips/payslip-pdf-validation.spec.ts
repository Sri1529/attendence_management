import { describe, it, expect, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module.js';
import { PayslipsService } from './payslips.service.js';
import { DataSource } from 'typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity.js';
import { Department } from '../departments/entities/department.entity.js';
import { Designation } from '../designations/entities/designation.entity.js';
import { PayrollPeriod, PayrollPeriodStatus } from '../payroll/entities/payroll-period.entity.js';
import { PayrollRecord } from '../payroll/entities/payroll-record.entity.js';
import { Payslip } from './entities/payslip.entity.js';

describe('Payslip PDF Generation Validation', () => {
  let moduleRef: TestingModule;
  let payslipsService: PayslipsService;
  let dataSource: DataSource;

  let company: Company;
  let employee: Employee;
  let period: PayrollPeriod;
  let record: PayrollRecord;
  let payslip: Payslip;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    payslipsService = moduleRef.get<PayslipsService>(PayslipsService);
    dataSource = moduleRef.get<DataSource>(DataSource);

    await dataSource.query(
      'TRUNCATE TABLE payslips, audit_logs, payroll_records, payroll_periods, advance_repayments, employee_advances, salary_adjustments, employee_salary_history, attendance, leave_records, leave_types, employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
    );

    const compRepo = dataSource.getRepository(Company);
    company = await compRepo.save(
      compRepo.create({
        name: 'Vetri Travels Private Limited',
        email: 'info@vetritravels.com',
        phone: '+91 98765 43210',
        address: '123 Main Street, Chennai, TN, India',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
      }),
    );

    const deptRepo = dataSource.getRepository(Department);
    const dept = await deptRepo.save(
      deptRepo.create({ company_id: company.id, name: 'Operations' }),
    );

    const desigRepo = dataSource.getRepository(Designation);
    const desig = await desigRepo.save(
      desigRepo.create({ company_id: company.id, name: 'Bus Driver' }),
    );

    const empRepo = dataSource.getRepository(Employee);
    employee = await empRepo.save(
      empRepo.create({
        company_id: company.id,
        employee_code: 'EMP-001',
        first_name: 'Sri',
        last_name: 'Hari',
        joining_date: '2026-09-01',
        department_id: dept.id,
        designation_id: desig.id,
        employment_status: EmploymentStatus.ACTIVE,
      }),
    );

    const periodRepo = dataSource.getRepository(PayrollPeriod);
    period = await periodRepo.save(
      periodRepo.create({
        company_id: company.id,
        period_year: 2026,
        period_month: 9,
        start_date: '2026-09-01',
        end_date: '2026-09-30',
        status: PayrollPeriodStatus.FINALIZED,
        total_payroll: '33000.00',
        total_deductions: '0.00',
        net_payable: '33000.00',
        employee_count: 1,
      }),
    );

    const recRepo = dataSource.getRepository(PayrollRecord);
    record = await recRepo.save(
      recRepo.create({
        company_id: company.id,
        payroll_period_id: period.id,
        employee_id: employee.id,
        basic_salary: '33000.00',
        working_days: 30,
        present_days: 30,
        absent_days: 0,
        half_days: 0,
        leave_days: 0,
        paid_leave_days: 0,
        unpaid_leave_days: 0,
        holiday_days: 0,
        overtime_hours: '0.00',
        overtime_amount: '0.00',
        bonus_amount: '0.00',
        incentive_amount: '0.00',
        other_earnings: '0.00',
        gross_salary: '33000.00',
        absence_deduction: '0.00',
        unpaid_leave_deduction: '0.00',
        advance_deduction: '0.00',
        other_deductions: '0.00',
        total_deductions: '0.00',
        net_salary: '33000.00',
        status: 'FINALIZED',
        calculated_at: new Date(),
      }),
    );

    const payslipRepo = dataSource.getRepository(Payslip);
    payslip = await payslipRepo.save(
      payslipRepo.create({
        company_id: company.id,
        payroll_record_id: record.id,
        employee_id: employee.id,
        payslip_number: 'PS-2026-09-000001',
        issued_at: new Date('2026-09-02'),
      }),
    );
  });

  it('should generate professional PDF buffer with correct filename and content', async () => {
    const res = await payslipsService.generatePdfBuffer(company.id, payslip.id);
    expect(res.buffer).toBeInstanceOf(Buffer);
    expect(res.buffer.length).toBeGreaterThan(1000);
    expect(res.filename).toBe('Vetri-Travels-Private-Limited-Payslip-Sri-Hari-September-2026.pdf');

    const rawPdfText = res.buffer.toString('binary');
    const cleanText = rawPdfText
      .replace(/<([0-9a-fA-F]+)>/g, (_, hex) => Buffer.from(hex, 'hex').toString('utf8'))
      .replace(/\[|\]|TJ/g, '')
      .replace(/\s-?\d+\s/g, ' ')
      .replace(/\s+/g, '');

    expect(cleanText).toContain('VETRITRAVELSPRIVATELIMITED');
    expect(cleanText).toContain('PAYSLIP');
    expect(cleanText).toContain('PS-2026-09-000001');
    expect(cleanText).toContain('EMP-001');
    expect(cleanText).toContain('SriHari');
    expect(cleanText).toContain('Operations');
    expect(cleanText).toContain('BusDriver');
    expect(cleanText).toContain('NETSALARYPAYABLE');
    expect(cleanText).not.toContain('Attendance&SalarySaaS');
    expect(cleanText).not.toContain('AUTOMATIC');
  });
});
