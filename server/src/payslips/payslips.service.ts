import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Payslip } from './entities/payslip.entity.js';
import { PayrollRecord } from '../payroll/entities/payroll-record.entity.js';
import { PayrollCorrection, PayrollCorrectionStatus } from '../payroll/entities/payroll-correction.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { PayslipQueryDto } from './dto/payslip-query.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

@Injectable()
export class PayslipsService {
  constructor(
    @InjectRepository(Payslip)
    private readonly payslipRepository: Repository<Payslip>,
    @InjectRepository(PayrollRecord)
    private readonly recordRepository: Repository<PayrollRecord>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(PayrollCorrection)
    private readonly correctionRepository: Repository<PayrollCorrection>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createPayslip(
    companyId: string,
    userId: string,
    payrollRecordId: string,
  ) {
    const record = await this.recordRepository.findOne({
      where: { id: payrollRecordId, company_id: companyId },
      relations: { payroll_period: true, employee: true, company: true },
    });

    if (!record) {
      throw new NotFoundException('Payroll record not found');
    }

    if (
      record.status === 'DRAFT' ||
      record.payroll_period.status === 'DRAFT'
    ) {
      throw new BadRequestException(
        'Payslips can only be generated for FINALIZED or PAID payroll records',
      );
    }

    const existing = await this.payslipRepository.findOne({
      where: { company_id: companyId, payroll_record_id: payrollRecordId },
      relations: { payroll_record: true, employee: true, company: true },
    });

    if (existing) {
      return existing;
    }

    const count = await this.payslipRepository.count({
      where: { company_id: companyId },
    });

    const monthStr = record.payroll_period.period_month
      .toString()
      .padStart(2, '0');
    const payslipNumber = `PS-${record.payroll_period.period_year}-${monthStr}-${(
      count + 1
    )
      .toString()
      .padStart(6, '0')}`;

    const payslip = this.payslipRepository.create({
      company_id: companyId,
      payroll_record_id: payrollRecordId,
      employee_id: record.employee_id,
      payslip_number: payslipNumber,
      issued_at: new Date(),
    });

    const saved = await this.payslipRepository.save(payslip);

    await this.auditLogsService.logAction({
      companyId,
      userId,
      action: 'PAYSLIP_CREATED',
      entityType: 'PAYSLIP',
      entityId: saved.id,
      metadata: {
        payslipNumber: saved.payslip_number,
        payrollRecordId,
        employeeCode: record.employee.employee_code,
      },
    });

    return this.findById(companyId, saved.id);
  }

  async findByPayrollRecordId(companyId: string, payrollRecordId: string) {
    const payslip = await this.payslipRepository.findOne({
      where: { company_id: companyId, payroll_record_id: payrollRecordId },
      relations: {
        payroll_record: { payroll_period: true },
        employee: { department: true, designation: true },
        company: true,
      },
    });

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    return payslip;
  }

  async findById(companyId: string, id: string) {
    const payslip = await this.payslipRepository.findOne({
      where: { id, company_id: companyId },
      relations: {
        payroll_record: { payroll_period: true },
        employee: { department: true, designation: true },
        company: true,
      },
    });

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    return payslip;
  }

  async findByEmployeeId(
    companyId: string,
    employeeId: string,
    query: PayslipQueryDto,
  ) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.payslipRepository.findAndCount({
      where: { company_id: companyId, employee_id: employeeId },
      relations: { payroll_record: { payroll_period: true } },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async findPayrollHistoryByEmployeeId(
    companyId: string,
    employeeId: string,
    query: PaginationQueryDto,
  ) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.recordRepository
      .createQueryBuilder('rec')
      .innerJoinAndSelect('rec.payroll_period', 'period')
      .where('rec.company_id = :companyId', { companyId })
      .andWhere('rec.employee_id = :employeeId', { employeeId })
      .andWhere('rec.status IN (:...statuses)', {
        statuses: ['FINALIZED', 'PAID'],
      })
      .orderBy('period.start_date', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async generatePdfBuffer(
    companyId: string,
    id: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const payslip = await this.findById(companyId, id);
    const rec = payslip.payroll_record;
    const period = rec.payroll_period;
    const emp = payslip.employee;
    const comp = payslip.company;

    const appliedCorrections = await this.correctionRepository.find({
      where: {
        company_id: companyId,
        payroll_record_id: rec.id,
        status: PayrollCorrectionStatus.APPLIED,
      },
      order: { created_at: 'ASC' },
    });

    let totalCorrectionCents = 0;
    for (const c of appliedCorrections) {
      totalCorrectionCents += Math.round(Number(c.amount) * 100);
    }
    const originalNetCents = Math.round(Number(rec.net_salary) * 100);
    const adjustedNetCents = originalNetCents + totalCorrectionCents;
    const netSalaryStr = (adjustedNetCents / 100).toFixed(2);

    const currencyCode = comp.currency || 'INR';

    const formatMoney = (val: string | number | null | undefined) => {
      const num = Number(val || 0);
      const symbol =
        currencyCode === 'USD' || currencyCode === '$'
          ? '$'
          : 'Rs. ';
      const locale =
        currencyCode === 'USD' || currencyCode === '$'
          ? 'en-US'
          : 'en-IN';
      return `${symbol}${num.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };

    const formatDateStr = (dateInput: string | Date | null | undefined) => {
      if (!dateInput) return '';
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(d.getTime())) return String(dateInput);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    };

    const monthName = new Date(
      period.period_year,
      period.period_month - 1,
      1,
    ).toLocaleString('en-US', { month: 'long' });
    const periodMonthYear = `${monthName} ${period.period_year}`;

    const companyClean = comp.name
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const empClean = `${emp.first_name}-${emp.last_name}`
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const filename = `${companyClean || 'Company'}-Payslip-${empClean || emp.employee_code}-${monthName}-${period.period_year}.pdf`;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', compress: false });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve({ buffer: Buffer.concat(buffers), filename }));
      doc.on('error', (err) => reject(err));

      // Header Block: Registered Company Name
      doc
        .fillColor('#111827')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(comp.name.toUpperCase(), { align: 'center' });
      doc.moveDown(0.2);
      doc
        .fillColor('#4B5563')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('PAYSLIP', { align: 'center' });

      if (comp.address || comp.phone || comp.email) {
        doc.moveDown(0.2);
        const contactInfo = [comp.address, comp.phone, comp.email]
          .filter(Boolean)
          .join(' | ');
        doc
          .fillColor('#6B7280')
          .fontSize(8)
          .font('Helvetica')
          .text(contactInfo, { align: 'center' });
      }

      doc.moveDown(0.8);

      // Horizontal Divider
      doc
        .strokeColor('#E5E7EB')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();
      doc.moveDown(0.8);

      // Document Metadata Header
      const metaY = doc.y;
      doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold');
      doc.text(`Company Name: `, 40, metaY, { continued: true });
      doc.font('Helvetica').text(comp.name);

      doc.font('Helvetica-Bold').text(`Payroll Period: `, 40, metaY + 14, { continued: true });
      doc
        .font('Helvetica')
        .text(
          `${periodMonthYear} (${formatDateStr(period.start_date)} – ${formatDateStr(period.end_date)})`,
        );

      doc
        .font('Helvetica-Bold')
        .text(`Payslip No.: `, 40, metaY + 28, { continued: true });
      doc.font('Helvetica').text(payslip.payslip_number);

      doc
        .font('Helvetica-Bold')
        .text(`Issue Date: `, 40, metaY + 42, { continued: true });
      doc.font('Helvetica').text(formatDateStr(payslip.issued_at));

      if (appliedCorrections.length > 0) {
        doc
          .fillColor('#D97706')
          .font('Helvetica-Bold')
          .text(`REVISED PAYSLIP`, 400, metaY, { align: 'right' });
      }

      doc.y = metaY + 62;
      doc
        .strokeColor('#E5E7EB')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();
      doc.moveDown(0.8);

      // Employee Details Section
      doc
        .fillColor('#111827')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('EMPLOYEE DETAILS');
      doc.moveDown(0.4);

      const empY = doc.y;
      doc.fillColor('#4B5563').fontSize(9);

      doc.font('Helvetica-Bold').text('Employee Name: ', 40, empY, {
        continued: true,
      });
      doc.font('Helvetica').text(`${emp.first_name} ${emp.last_name}`);

      doc.font('Helvetica-Bold').text('Employee Code: ', 40, empY + 14, {
        continued: true,
      });
      doc.font('Helvetica').text(emp.employee_code);

      doc.font('Helvetica-Bold').text('Joining Date: ', 40, empY + 28, {
        continued: true,
      });
      doc.font('Helvetica').text(formatDateStr(emp.joining_date));

      let rightY = empY;
      if (emp.department?.name) {
        doc
          .font('Helvetica-Bold')
          .text('Department: ', 300, rightY, { continued: true });
        doc.font('Helvetica').text(emp.department.name);
        rightY += 14;
      }
      if (emp.designation?.name) {
        doc
          .font('Helvetica-Bold')
          .text('Designation: ', 300, rightY, { continued: true });
        doc.font('Helvetica').text(emp.designation.name);
        rightY += 14;
      }

      doc.y = Math.max(empY + 44, rightY + 14);
      doc.moveDown(0.5);
      doc
        .strokeColor('#E5E7EB')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();
      doc.moveDown(0.8);

      // Attendance Summary Section
      doc
        .fillColor('#111827')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('ATTENDANCE SUMMARY');
      doc.moveDown(0.4);

      const attY = doc.y;
      doc.fillColor('#374151').fontSize(8.5).font('Helvetica');

      const paidLeave = rec.paid_leave_days ?? rec.leave_days ?? 0;
      const unpaidLeave = rec.unpaid_leave_days ?? 0;

      doc.text(
        `Working Days: ${rec.working_days}    |    Present: ${rec.present_days}    |    Absent: ${rec.absent_days}    |    Half Days: ${rec.half_days}    |    Paid Leave: ${paidLeave}    |    Unpaid Leave: ${unpaidLeave}    |    Holidays: ${rec.holiday_days}`,
        40,
        attY,
      );

      doc.y = attY + 18;
      doc.moveDown(0.5);
      doc
        .strokeColor('#E5E7EB')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();
      doc.moveDown(0.8);

      // Earnings & Deductions Tables
      const tableY = doc.y;

      // Column 1: EARNINGS
      doc
        .fillColor('#059669')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('EARNINGS', 40, tableY);
      doc
        .fillColor('#6B7280')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('AMOUNT', 220, tableY, { align: 'right' });

      let earnY = tableY + 18;
      const earnings = [
        { label: 'Basic Salary', amount: rec.basic_salary },
        { label: 'Overtime', amount: rec.overtime_amount },
        { label: 'Bonus', amount: rec.bonus_amount },
        { label: 'Incentive', amount: rec.incentive_amount },
        { label: 'Other Earnings', amount: rec.other_earnings },
      ];

      doc.fontSize(8.5);
      for (const e of earnings) {
        doc.fillColor('#374151').font('Helvetica').text(e.label, 40, earnY);
        doc
          .fillColor('#111827')
          .font('Helvetica')
          .text(formatMoney(e.amount), 160, earnY, {
            width: 120,
            align: 'right',
          });
        earnY += 14;
      }

      doc
        .strokeColor('#D1D5DB')
        .lineWidth(0.5)
        .moveTo(40, earnY)
        .lineTo(280, earnY)
        .stroke();
      earnY += 6;

      doc
        .fillColor('#059669')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Gross Earnings', 40, earnY);
      doc
        .fillColor('#059669')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(formatMoney(rec.gross_salary), 160, earnY, {
          width: 120,
          align: 'right',
        });
      earnY += 18;

      // Column 2: DEDUCTIONS
      doc
        .fillColor('#DC2626')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('DEDUCTIONS', 315, tableY);
      doc
        .fillColor('#6B7280')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('AMOUNT', 495, tableY, { align: 'right' });

      let dedY = tableY + 18;
      const deductions = [
        { label: 'Absence Deduction', amount: rec.absence_deduction },
        { label: 'Unpaid Leave Deduction', amount: rec.unpaid_leave_deduction },
        { label: 'Advance Deduction', amount: rec.advance_deduction },
        { label: 'Loan Repayment', amount: rec.loan_deduction || '0.00' },
        { label: 'Other Deductions', amount: rec.other_deductions },
      ];

      doc.fontSize(8.5);
      for (const d of deductions) {
        doc.fillColor('#374151').font('Helvetica').text(d.label, 315, dedY);
        doc
          .fillColor('#111827')
          .font('Helvetica')
          .text(formatMoney(d.amount), 435, dedY, {
            width: 120,
            align: 'right',
          });
        dedY += 14;
      }

      doc
        .strokeColor('#D1D5DB')
        .lineWidth(0.5)
        .moveTo(315, dedY)
        .lineTo(555, dedY)
        .stroke();
      dedY += 6;

      doc
        .fillColor('#DC2626')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Total Deductions', 315, dedY);
      doc
        .fillColor('#DC2626')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(formatMoney(rec.total_deductions), 435, dedY, {
          width: 120,
          align: 'right',
        });
      dedY += 18;

      doc.y = Math.max(earnY, dedY) + 10;

      // Net Salary Section Box
      const netY = doc.y;
      doc.rect(40, netY, 515, 46).fillAndStroke('#F3F4F6', '#E5E7EB');

      doc
        .fillColor('#4B5563')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('NET SALARY PAYABLE', 55, netY + 10);
      doc
        .fillColor('#111827')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(formatMoney(netSalaryStr), 55, netY + 22);

      doc.y = netY + 60;
      doc.moveDown(1.5);

      // Professional Footer
      doc
        .fillColor('#6B7280')
        .fontSize(8)
        .font('Helvetica')
        .text(
          'This payslip is computer-generated and does not require a signature.',
          { align: 'center' },
        );
      doc.moveDown(0.3);
      doc
        .fillColor('#374151')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(comp.name, { align: 'center' });

      doc.end();
    });
  }
}
