import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PayrollPeriod, PayrollPeriodStatus } from './entities/payroll-period.entity.js';
import { PayrollRecord, PayrollRecordStatus } from './entities/payroll-record.entity.js';
import { PayrollCorrection, PayrollCorrectionStatus, PayrollCorrectionType } from './entities/payroll-correction.entity.js';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity.js';
import { EmployeeSalaryHistory } from '../salary/entities/employee-salary-history.entity.js';
import { Attendance, AttendanceStatus } from '../attendance/entities/attendance.entity.js';
import { SalaryAdjustment, AdjustmentStatus, AdjustmentType } from '../salary/entities/salary-adjustment.entity.js';
import { EmployeeAdvance, AdvanceStatus } from '../advances/entities/employee-advance.entity.js';
import { AdvanceRepayment } from '../advances/entities/advance-repayment.entity.js';
import { LeaveRecord, LeaveStatus } from '../leave-records/entities/leave-record.entity.js';
import { Company, AbsenceDeductionMode } from '../companies/entities/company.entity.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto.js';
import { GeneratePayrollDto } from './dto/generate-payroll.dto.js';
import { PayrollPeriodQueryDto } from './dto/payroll-period-query.dto.js';
import { PayrollRecordQueryDto } from './dto/payroll-record-query.dto.js';
import { CreatePayrollCorrectionDto } from './dto/create-payroll-correction.dto.js';
import { ReversePayrollCorrectionDto } from './dto/reverse-payroll-correction.dto.js';
import { ReopenPayrollPeriodDto } from './dto/reopen-payroll-period.dto.js';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollPeriod)
    private readonly periodRepository: Repository<PayrollPeriod>,
    @InjectRepository(PayrollRecord)
    private readonly recordRepository: Repository<PayrollRecord>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeeSalaryHistory)
    private readonly salaryHistoryRepository: Repository<EmployeeSalaryHistory>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(SalaryAdjustment)
    private readonly adjustmentRepository: Repository<SalaryAdjustment>,
    @InjectRepository(EmployeeAdvance)
    private readonly advanceRepository: Repository<EmployeeAdvance>,
    @InjectRepository(PayrollCorrection)
    private readonly correctionRepository: Repository<PayrollCorrection>,
    private readonly auditLogsService: AuditLogsService,
    private readonly dataSource: DataSource,
  ) {}

  private getDatesInMonth(year: number, month: number) {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay
      .toString()
      .padStart(2, '0')}`;
    return { startDate, endDate, lastDay };
  }

  async createPeriod(
    companyId: string,
    userId: string,
    dto: CreatePayrollPeriodDto,
  ) {
    const { startDate, endDate } = this.getDatesInMonth(
      dto.periodYear,
      dto.periodMonth,
    );

    const existing = await this.periodRepository.findOne({
      where: {
        company_id: companyId,
        period_year: dto.periodYear,
        period_month: dto.periodMonth,
      },
    });

    if (existing) {
      if (existing.status === PayrollPeriodStatus.CANCELLED) {
        existing.status = PayrollPeriodStatus.DRAFT;
        existing.start_date = startDate;
        existing.end_date = endDate;
        existing.created_by = userId;
        existing.finalized_at = null;
        existing.paid_at = null;

        const saved = await this.periodRepository.save(existing);

        await this.auditLogsService.logAction({
          companyId,
          userId,
          action: 'PAYROLL_CREATED',
          entityType: 'PAYROLL_PERIOD',
          entityId: saved.id,
          metadata: { periodYear: dto.periodYear, periodMonth: dto.periodMonth, reopenedFromCancelled: true },
        });

        return saved;
      }

      throw new BadRequestException(
        'Payroll period already exists for this year and month',
      );
    }

    const period = this.periodRepository.create({
      company_id: companyId,
      period_year: dto.periodYear,
      period_month: dto.periodMonth,
      start_date: startDate,
      end_date: endDate,
      status: PayrollPeriodStatus.DRAFT,
      created_by: userId,
    });

    const saved = await this.periodRepository.save(period);

    await this.auditLogsService.logAction({
      companyId,
      userId,
      action: 'PAYROLL_CREATED',
      entityType: 'PAYROLL_PERIOD',
      entityId: saved.id,
      metadata: { periodYear: dto.periodYear, periodMonth: dto.periodMonth },
    });

    return saved;
  }

  async findAllPeriods(companyId: string, query: PayrollPeriodQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.periodRepository
      .createQueryBuilder('p')
      .where('p.company_id = :companyId', { companyId });

    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }

    qb.orderBy('p.period_year', 'DESC')
      .addOrderBy('p.period_month', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async findOnePeriod(companyId: string, id: string) {
    const period = await this.periodRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!period) {
      throw new NotFoundException('Payroll period not found');
    }

    const records = await this.recordRepository.find({
      where: { company_id: companyId, payroll_period_id: id },
    });

    const totalGross = records
      .reduce((sum, r) => sum + parseFloat(r.gross_salary), 0)
      .toFixed(2);
    const totalDeductions = records
      .reduce((sum, r) => sum + parseFloat(r.total_deductions), 0)
      .toFixed(2);
    const totalNet = records
      .reduce((sum, r) => sum + parseFloat(r.net_salary), 0)
      .toFixed(2);

    return {
      ...period,
      employeeCount: records.length,
      totals: {
        totalGross,
        totalDeductions,
        totalNet,
      },
    };
  }

  async generatePayroll(
    companyId: string,
    userId: string,
    periodId: string,
    dto: GeneratePayrollDto,
  ) {
    const period = await this.periodRepository.findOne({
      where: { id: periodId, company_id: companyId },
    });

    if (!period) {
      throw new NotFoundException('Payroll period not found');
    }

    if (period.status === PayrollPeriodStatus.PAID) {
      throw new BadRequestException(
        'Paid payroll is immutable and cannot be modified.',
      );
    }

    if (
      period.status !== PayrollPeriodStatus.DRAFT &&
      period.status !== PayrollPeriodStatus.CORRECTION_REQUIRED
    ) {
      throw new BadRequestException(
        'Cannot calculate or regenerate non-draft payroll period',
      );
    }

    const activeEmployees = await this.employeeRepository.find({
      where: { company_id: companyId },
    });

    const eligibleEmployees = activeEmployees.filter(
      (e) => e.employment_status !== EmploymentStatus.INACTIVE,
    );

    const missingSalaryEmployees: string[] = [];

    for (const emp of eligibleEmployees) {
      const sal = await this.salaryHistoryRepository
        .createQueryBuilder('sh')
        .where('sh.company_id = :companyId', { companyId })
        .andWhere('sh.employee_id = :employeeId', { employeeId: emp.id })
        .andWhere('sh.effective_from <= :startDate', {
          startDate: period.start_date,
        })
        .andWhere(
          '(sh.effective_to IS NULL OR sh.effective_to >= :startDate)',
          { startDate: period.start_date },
        )
        .getOne();

      if (!sal) {
        missingSalaryEmployees.push(`${emp.first_name} ${emp.last_name} (${emp.employee_code})`);
      }
    }

    if (missingSalaryEmployees.length > 0) {
      throw new BadRequestException(
        `Missing basic salary for active employee(s): ${missingSalaryEmployees.join(', ')}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const company = await this.dataSource.getRepository(Company).findOne({
      where: { id: companyId },
    });
    const absenceDeductionMode = company?.absence_deduction_mode || AbsenceDeductionMode.AUTOMATIC;

    try {
      const periodLocked = await queryRunner.manager.findOne(PayrollPeriod, {
        where: { id: periodId, company_id: companyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!periodLocked) {
        throw new NotFoundException('Payroll period not found');
      }
      if (periodLocked.status === PayrollPeriodStatus.PAID) {
        throw new BadRequestException(
          'Paid payroll is immutable and cannot be modified.',
        );
      }
      if (
        periodLocked.status !== PayrollPeriodStatus.DRAFT &&
        periodLocked.status !== PayrollPeriodStatus.CORRECTION_REQUIRED
      ) {
        throw new BadRequestException(
          'Cannot calculate or regenerate non-draft payroll period',
        );
      }

      let recordsCount = 0;

      for (const emp of eligibleEmployees) {
        const sal = await queryRunner.manager
          .createQueryBuilder(EmployeeSalaryHistory, 'sh')
          .where('sh.company_id = :companyId', { companyId })
          .andWhere('sh.employee_id = :employeeId', { employeeId: emp.id })
          .andWhere('sh.effective_from <= :startDate', {
            startDate: period.start_date,
          })
          .andWhere(
            '(sh.effective_to IS NULL OR sh.effective_to >= :startDate)',
            { startDate: period.start_date },
          )
          .getOne();

        const basicSalaryNum = parseFloat(sal!.basic_salary);

        const attendances = await queryRunner.manager
          .createQueryBuilder(Attendance, 'att')
          .where('att.company_id = :companyId', { companyId })
          .andWhere('att.employee_id = :employeeId', { employeeId: emp.id })
          .andWhere(
            'att.attendance_date >= :startDate AND att.attendance_date <= :endDate',
            { startDate: period.start_date, endDate: period.end_date },
          )
          .getMany();

        let presentDays = 0;
        let absentDays = 0;
        let halfDays = 0;
        let leaveDays = 0;
        let holidayDays = 0;

        for (const att of attendances) {
          if (att.status === AttendanceStatus.PRESENT) presentDays++;
          else if (att.status === AttendanceStatus.ABSENT) absentDays++;
          else if (att.status === AttendanceStatus.HALF_DAY) halfDays++;
          else if (att.status === AttendanceStatus.LEAVE) leaveDays++;
          else if (att.status === AttendanceStatus.HOLIDAY) holidayDays++;
        }

        const approvedLeaves = await queryRunner.manager
          .createQueryBuilder(LeaveRecord, 'lr')
          .leftJoinAndSelect('lr.leave_type', 'lt')
          .where('lr.company_id = :companyId', { companyId })
          .andWhere('lr.employee_id = :employeeId', { employeeId: emp.id })
          .andWhere('lr.status = :approvedStatus', { approvedStatus: LeaveStatus.APPROVED })
          .andWhere('lr.start_date <= :endDate AND lr.end_date >= :startDate', {
            startDate: period.start_date,
            endDate: period.end_date,
          })
          .getMany();

        let paidLeaveDays = 0;
        let unpaidLeaveDays = 0;

        for (const lr of approvedLeaves) {
          const s = lr.start_date > period.start_date ? lr.start_date : period.start_date;
          const e = lr.end_date < period.end_date ? lr.end_date : period.end_date;
          const d1 = new Date(s);
          const d2 = new Date(e);
          const diffDays = Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1);

          const isPaid = lr.is_paid !== null && lr.is_paid !== undefined
            ? lr.is_paid
            : (lr.leave_type ? lr.leave_type.is_paid : true);

          if (isPaid) {
            paidLeaveDays += diffDays;
          } else {
            unpaidLeaveDays += diffDays;
          }
        }

        leaveDays = Math.max(leaveDays, paidLeaveDays + unpaidLeaveDays);

        const totalCalendarDays = new Date(
          period.period_year,
          period.period_month,
          0,
        ).getDate();
        const workingDays = Math.max(1, totalCalendarDays - holidayDays);

        const dailySalary = Math.round((basicSalaryNum / workingDays) * 100) / 100;
        const unpaidLeaveDeduction = Math.round(dailySalary * unpaidLeaveDays * 100) / 100;

        let absenceDeduction = 0;
        if (absenceDeductionMode === AbsenceDeductionMode.MANUAL) {
          const manualInput = (dto.manualAbsenceDeductions || []).find(
            (item) => item && item.employeeId === emp.id && item.amount !== undefined,
          );
          if (manualInput) {
            absenceDeduction = parseFloat(manualInput.amount);
          } else if (absentDays > 0 || halfDays > 0) {
            throw new BadRequestException(
              `Manual absence deduction is required for employee ${emp.first_name} ${emp.last_name}`,
            );
          } else {
            absenceDeduction = 0;
          }
        } else {
          const absentDeduct = Math.round(dailySalary * absentDays * 100) / 100;
          const halfDayDeduct = Math.round(dailySalary * 0.5 * halfDays * 100) / 100;
          absenceDeduction = absentDeduct + halfDayDeduct;
        }

        const adjustments = await queryRunner.manager
          .createQueryBuilder(SalaryAdjustment, 'sa')
          .where('sa.company_id = :companyId', { companyId })
          .andWhere('sa.employee_id = :employeeId', { employeeId: emp.id })
          .andWhere('sa.status = :adjStatus', { adjStatus: AdjustmentStatus.ACTIVE })
          .andWhere(
            'sa.adjustment_date >= :startDate AND sa.adjustment_date <= :endDate',
            { startDate: period.start_date, endDate: period.end_date },
          )
          .getMany();

        let overtimeAmount = 0;
        let bonusAmount = 0;
        let incentiveAmount = 0;
        let otherEarnings = 0;
        let otherDeductions = 0;

        for (const adj of adjustments) {
          const amt = parseFloat(adj.amount);
          if (adj.adjustment_type === AdjustmentType.OVERTIME) overtimeAmount += amt;
          else if (adj.adjustment_type === AdjustmentType.BONUS) bonusAmount += amt;
          else if (adj.adjustment_type === AdjustmentType.INCENTIVE) incentiveAmount += amt;
          else if (adj.adjustment_type === AdjustmentType.OTHER_EARNING) otherEarnings += amt;
          else if (adj.adjustment_type === AdjustmentType.OTHER_DEDUCTION) otherDeductions += amt;
        }

        let advanceDeductionTotal = 0;
        const empExplicitAdvDeductions = (dto.advanceDeductions || []).filter(
          (item) => item && item.advanceId && item.amount,
        );

        if (empExplicitAdvDeductions.length > 0) {
          for (const item of empExplicitAdvDeductions) {
            const adv = await queryRunner.manager.findOne(EmployeeAdvance, {
              where: { id: item.advanceId, company_id: companyId },
            });

            if (adv && adv.employee_id === emp.id && adv.status === AdvanceStatus.ACTIVE) {
              const outstanding = parseFloat(adv.amount);
              const reqAmt = parseFloat(item.amount);

              if (reqAmt > outstanding + 0.001) {
                throw new BadRequestException(
                  `Advance deduction amount ${reqAmt} exceeds active advance amount ${outstanding.toFixed(2)}`,
                );
              }
              advanceDeductionTotal += reqAmt;
            }
          }
        } else {
          // Auto-detect active advances for employee issued on or before period end_date
          const activeAdvances = await queryRunner.manager
            .createQueryBuilder(EmployeeAdvance, 'ea')
            .where('ea.company_id = :companyId', { companyId })
            .andWhere('ea.employee_id = :employeeId', { employeeId: emp.id })
            .andWhere('ea.status = :status', { status: AdvanceStatus.ACTIVE })
            .andWhere('ea.advance_date <= :endDate', { endDate: period.end_date })
            .getMany();

          for (const adv of activeAdvances) {
            const amt = parseFloat(adv.amount);
            if (amt > 0) {
              advanceDeductionTotal += amt;
            }
          }
        }

        const grossSalaryNum =
          basicSalaryNum +
          overtimeAmount +
          bonusAmount +
          incentiveAmount +
          otherEarnings;
        const totalDeductionsNum =
          absenceDeduction + unpaidLeaveDeduction + otherDeductions + advanceDeductionTotal;
        const netSalaryNum = grossSalaryNum - totalDeductionsNum;

        if (netSalaryNum < -0.001) {
          throw new BadRequestException(
            `Total deductions exceed gross salary for employee ${emp.first_name} ${emp.last_name}`,
          );
        }

        let existingRecord = await queryRunner.manager.findOne(PayrollRecord, {
          where: {
            company_id: companyId,
            payroll_period_id: periodId,
            employee_id: emp.id,
          },
        });

        if (existingRecord) {
          existingRecord.basic_salary = basicSalaryNum.toFixed(2);
          existingRecord.working_days = workingDays;
          existingRecord.present_days = presentDays;
          existingRecord.absent_days = absentDays;
          existingRecord.half_days = halfDays;
          existingRecord.leave_days = leaveDays;
          existingRecord.holiday_days = holidayDays;
          existingRecord.paid_leave_days = paidLeaveDays;
          existingRecord.unpaid_leave_days = unpaidLeaveDays;
          existingRecord.unpaid_leave_deduction = unpaidLeaveDeduction.toFixed(2);
          existingRecord.absence_deduction = absenceDeduction.toFixed(2);
          existingRecord.absence_deduction_mode = absenceDeductionMode;
          existingRecord.overtime_amount = overtimeAmount.toFixed(2);
          existingRecord.bonus_amount = bonusAmount.toFixed(2);
          existingRecord.incentive_amount = incentiveAmount.toFixed(2);
          existingRecord.other_earnings = otherEarnings.toFixed(2);
          existingRecord.other_deductions = otherDeductions.toFixed(2);
          existingRecord.advance_deduction = advanceDeductionTotal.toFixed(2);
          existingRecord.gross_salary = grossSalaryNum.toFixed(2);
          existingRecord.total_deductions = totalDeductionsNum.toFixed(2);
          existingRecord.net_salary = Math.max(0, netSalaryNum).toFixed(2);
          existingRecord.calculated_at = new Date();
          await queryRunner.manager.save(existingRecord);
        } else {
          existingRecord = queryRunner.manager.create(PayrollRecord, {
            company_id: companyId,
            payroll_period_id: periodId,
            employee_id: emp.id,
            basic_salary: basicSalaryNum.toFixed(2),
            working_days: workingDays,
            present_days: presentDays,
            absent_days: absentDays,
            half_days: halfDays,
            leave_days: leaveDays,
            holiday_days: holidayDays,
            paid_leave_days: paidLeaveDays,
            unpaid_leave_days: unpaidLeaveDays,
            unpaid_leave_deduction: unpaidLeaveDeduction.toFixed(2),
            absence_deduction: absenceDeduction.toFixed(2),
            absence_deduction_mode: absenceDeductionMode,
            overtime_amount: overtimeAmount.toFixed(2),
            bonus_amount: bonusAmount.toFixed(2),
            incentive_amount: incentiveAmount.toFixed(2),
            other_earnings: otherEarnings.toFixed(2),
            other_deductions: otherDeductions.toFixed(2),
            advance_deduction: advanceDeductionTotal.toFixed(2),
            gross_salary: grossSalaryNum.toFixed(2),
            total_deductions: totalDeductionsNum.toFixed(2),
            net_salary: Math.max(0, netSalaryNum).toFixed(2),
            status: PayrollRecordStatus.DRAFT,
          });
          await queryRunner.manager.save(existingRecord);
        }

        recordsCount++;
      }

      const wasReopened = periodLocked.status === PayrollPeriodStatus.CORRECTION_REQUIRED;
      periodLocked.status = PayrollPeriodStatus.DRAFT;
      await queryRunner.manager.save(periodLocked);

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'PAYROLL_GENERATED',
        entityType: 'PAYROLL_PERIOD',
        entityId: periodId,
        metadata: {
          recordsCalculated: recordsCount,
          recalculatedFromCorrection: wasReopened,
        },
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();
      return this.findOnePeriod(companyId, periodId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async finalizePayroll(companyId: string, userId: string, periodId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const period = await queryRunner.manager.findOne(PayrollPeriod, {
        where: { id: periodId, company_id: companyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!period) {
        throw new NotFoundException('Payroll period not found');
      }

      if (period.status === PayrollPeriodStatus.PAID) {
        throw new BadRequestException(
          'Paid payroll is immutable and cannot be modified.',
        );
      }

      if (period.status !== PayrollPeriodStatus.DRAFT) {
        throw new BadRequestException(
          'Only DRAFT payroll periods can be finalized',
        );
      }

      const records = await queryRunner.manager.find(PayrollRecord, {
        where: { company_id: companyId, payroll_period_id: periodId },
      });

      if (records.length === 0) {
        throw new BadRequestException(
          'No payroll records found for this period',
        );
      }

      const now = new Date();

      for (const rec of records) {
        const advDeductNum = parseFloat(rec.advance_deduction);
        if (advDeductNum > 0) {
          const activeAdv = await queryRunner.manager.findOne(EmployeeAdvance, {
            where: {
              company_id: companyId,
              employee_id: rec.employee_id,
              status: AdvanceStatus.ACTIVE,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (activeAdv) {
            const repayment = queryRunner.manager.create(AdvanceRepayment, {
              company_id: companyId,
              advance_id: activeAdv.id,
              payroll_record_id: rec.id,
              amount: advDeductNum.toFixed(2),
              repayment_date: period.end_date,
              notes: `Auto-deducted via payroll period ending ${period.end_date}`,
              created_by: userId,
            });
            await queryRunner.manager.save(repayment);

            activeAdv.status = AdvanceStatus.SETTLED;
            await queryRunner.manager.save(activeAdv);
          }
        }

        rec.status = PayrollRecordStatus.FINALIZED;
        rec.finalized_at = now;
        await queryRunner.manager.save(rec);
      }

      period.status = PayrollPeriodStatus.FINALIZED;
      period.finalized_at = now;
      await queryRunner.manager.save(period);

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'PAYROLL_FINALIZED',
        entityType: 'PAYROLL_PERIOD',
        entityId: periodId,
        metadata: { recordCount: records.length },
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();
      return this.findOnePeriod(companyId, periodId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async markPaid(companyId: string, userId: string, periodId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const period = await queryRunner.manager.findOne(PayrollPeriod, {
        where: { id: periodId, company_id: companyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!period) {
        throw new NotFoundException('Payroll period not found');
      }

      if (period.status === PayrollPeriodStatus.PAID) {
        throw new BadRequestException(
          'Paid payroll is immutable and cannot be modified.',
        );
      }

      if (period.status !== PayrollPeriodStatus.FINALIZED) {
        throw new BadRequestException(
          'Only FINALIZED payroll periods can be marked as paid',
        );
      }

      const now = new Date();
      period.status = PayrollPeriodStatus.PAID;
      period.paid_at = now;
      await queryRunner.manager.save(period);

      const records = await queryRunner.manager.find(PayrollRecord, {
        where: { company_id: companyId, payroll_period_id: periodId },
      });

      for (const rec of records) {
        rec.status = PayrollRecordStatus.PAID;
        await queryRunner.manager.save(rec);
      }

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'PAYROLL_MARKED_PAID',
        entityType: 'PAYROLL_PERIOD',
        entityId: periodId,
        metadata: { recordCount: records.length },
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();
      return this.findOnePeriod(companyId, periodId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelPeriod(companyId: string, userId: string, periodId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const period = await queryRunner.manager.findOne(PayrollPeriod, {
        where: { id: periodId, company_id: companyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!period) {
        throw new NotFoundException('Payroll period not found');
      }

      if (period.status === PayrollPeriodStatus.PAID) {
        throw new BadRequestException(
          'Paid payroll is immutable and cannot be modified.',
        );
      }

      if (period.status !== PayrollPeriodStatus.DRAFT) {
        throw new BadRequestException(
          'Only DRAFT payroll periods can be cancelled',
        );
      }

      period.status = PayrollPeriodStatus.CANCELLED;
      const saved = await queryRunner.manager.save(period);

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'PAYROLL_CANCELLED',
        entityType: 'PAYROLL_PERIOD',
        entityId: periodId,
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async reopenPeriodForCorrection(
    companyId: string,
    userId: string,
    periodId: string,
    dto: ReopenPayrollPeriodDto,
  ) {
    if (!dto || !dto.reason || dto.reason.trim() === '') {
      throw new BadRequestException('Reason for reopening is mandatory.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const period = await queryRunner.manager.findOne(PayrollPeriod, {
        where: { id: periodId, company_id: companyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!period) {
        throw new NotFoundException('Payroll period not found');
      }

      if (period.status === PayrollPeriodStatus.PAID) {
        throw new BadRequestException(
          'Paid payroll is immutable and cannot be modified.',
        );
      }

      if (period.status !== PayrollPeriodStatus.FINALIZED) {
        throw new BadRequestException(
          'Only FINALIZED payroll periods can be reopened for correction.',
        );
      }

      const records = await queryRunner.manager.find(PayrollRecord, {
        where: { company_id: companyId, payroll_period_id: periodId },
      });

      const netPayableNum = records.reduce(
        (sum, r) => sum + parseFloat(r.net_salary || '0'),
        0,
      );
      const netPayable = netPayableNum.toFixed(2);

      const previousStatus = period.status;
      period.status = PayrollPeriodStatus.CORRECTION_REQUIRED;
      await queryRunner.manager.save(period);

      for (const rec of records) {
        rec.status = PayrollRecordStatus.DRAFT;
        await queryRunner.manager.save(rec);
      }

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'PAYROLL_REOPENED_FOR_CORRECTION',
        entityType: 'PAYROLL_PERIOD',
        entityId: periodId,
        metadata: {
          previousStatus,
          newStatus: PayrollPeriodStatus.CORRECTION_REQUIRED,
          netPayable,
          reason: dto.reason.trim(),
        },
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();
      return this.findOnePeriod(companyId, periodId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllRecords(companyId: string, periodId: string, query: PayrollRecordQueryDto) {
    const period = await this.periodRepository.findOne({
      where: { id: periodId, company_id: companyId },
    });

    if (!period) {
      throw new NotFoundException('Payroll period not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.recordRepository
      .createQueryBuilder('rec')
      .leftJoinAndSelect('rec.employee', 'employee')
      .where('rec.company_id = :companyId', { companyId })
      .andWhere('rec.payroll_period_id = :periodId', { periodId });

    if (query.employeeId) {
      qb.andWhere('rec.employee_id = :employeeId', {
        employeeId: query.employeeId,
      });
    }

    if (query.status) {
      qb.andWhere('rec.status = :status', { status: query.status });
    }

    qb.orderBy('rec.created_at', 'ASC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async findOneRecord(companyId: string, id: string) {
    const record = await this.recordRepository.findOne({
      where: { id, company_id: companyId },
      relations: { employee: true, payroll_period: true },
    });

    if (!record) {
      throw new NotFoundException('Payroll record not found');
    }

    return record;
  }

  async getRecordCorrectionsBreakdown(companyId: string, recordId: string) {
    const record = await this.findOneRecord(companyId, recordId);
    const corrections = await this.correctionRepository.find({
      where: { company_id: companyId, payroll_record_id: recordId },
      relations: { created_by_user: true, approved_by_user: true },
      order: { created_at: 'ASC' },
    });

    let totalCorrectionCents = 0;
    for (const c of corrections) {
      if (c.status === PayrollCorrectionStatus.APPLIED) {
        totalCorrectionCents += Math.round(Number(c.amount) * 100);
      }
    }

    const originalNetCents = Math.round(Number(record.net_salary) * 100);
    const adjustedNetCents = originalNetCents + totalCorrectionCents;

    return {
      record,
      corrections,
      originalNetPay: record.net_salary,
      totalCorrectionsAmount: (totalCorrectionCents / 100).toFixed(2),
      adjustedNetPay: (adjustedNetCents / 100).toFixed(2),
    };
  }

  async createAndApplyCorrection(
    companyId: string,
    userId: string,
    payrollRecordId: string,
    dto: CreatePayrollCorrectionDto,
  ) {
    const numericAmount = Number(dto.amount);
    if (isNaN(numericAmount) || numericAmount === 0) {
      throw new BadRequestException('Correction amount must be a non-zero number');
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Reason for correction is mandatory');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const record = await queryRunner.manager.findOne(PayrollRecord, {
        where: { id: payrollRecordId, company_id: companyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!record) {
        throw new NotFoundException('Payroll record not found');
      }

      const period = await queryRunner.manager.findOne(PayrollPeriod, {
        where: { id: record.payroll_period_id, company_id: companyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!period) {
        throw new NotFoundException('Payroll period not found');
      }

      if (
        period.status === PayrollPeriodStatus.PAID ||
        record.status === PayrollRecordStatus.PAID
      ) {
        throw new BadRequestException(
          'Paid payroll is immutable and cannot be modified.',
        );
      }

      if (
        period.status !== PayrollPeriodStatus.FINALIZED ||
        record.status !== PayrollRecordStatus.FINALIZED
      ) {
        throw new BadRequestException(
          'Corrections can only be created for FINALIZED payroll records',
        );
      }

      const employee = await queryRunner.manager.findOne(Employee, {
        where: { id: record.employee_id, company_id: companyId },
      });

      const formattedAmount = (Math.round(numericAmount * 100) / 100).toFixed(2);

      const correction = queryRunner.manager.create(PayrollCorrection, {
        company_id: companyId,
        payroll_record_id: payrollRecordId,
        employee_id: record.employee_id,
        correction_type: dto.type,
        amount: formattedAmount,
        reason: dto.reason.trim(),
        status: PayrollCorrectionStatus.APPLIED,
        created_by: userId,
        approved_by: userId,
        applied_at: new Date(),
      });

      const savedCorrection = await queryRunner.manager.save(correction);

      // Compute updated breakdown for audit logging
      const allApplied = await queryRunner.manager.find(PayrollCorrection, {
        where: {
          company_id: companyId,
          payroll_record_id: payrollRecordId,
          status: PayrollCorrectionStatus.APPLIED,
        },
      });

      let totalCents = 0;
      for (const c of allApplied) {
        totalCents += Math.round(Number(c.amount) * 100);
      }

      const originalCents = Math.round(Number(record.net_salary) * 100);
      const adjustedNetStr = ((originalCents + totalCents) / 100).toFixed(2);

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'PAYROLL_CORRECTION_CREATED',
        entityType: 'PAYROLL_CORRECTION',
        entityId: savedCorrection.id,
        metadata: {
          payrollRecordId,
          employeeId: record.employee_id,
          employeeCode: employee?.employee_code,
          employeeName: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
          correctionId: savedCorrection.id,
          correctionType: savedCorrection.correction_type,
          amount: savedCorrection.amount,
          reason: savedCorrection.reason,
          originalNetPay: record.net_salary,
          adjustedNetPay: adjustedNetStr,
        },
        entityManager: queryRunner.manager,
      });

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'PAYROLL_CORRECTION_APPLIED',
        entityType: 'PAYROLL_CORRECTION',
        entityId: savedCorrection.id,
        metadata: {
          payrollRecordId,
          employeeId: record.employee_id,
          employeeCode: employee?.employee_code,
          employeeName: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
          correctionId: savedCorrection.id,
          correctionType: savedCorrection.correction_type,
          amount: savedCorrection.amount,
          reason: savedCorrection.reason,
          originalNetPay: record.net_salary,
          adjustedNetPay: adjustedNetStr,
        },
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();

      return this.correctionRepository.findOne({
        where: { id: savedCorrection.id, company_id: companyId },
        relations: { employee: true, created_by_user: true },
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async reverseCorrection(
    companyId: string,
    userId: string,
    correctionId: string,
    dto: ReversePayrollCorrectionDto,
  ) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Reason for reversal is mandatory');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const targetCorrection = await queryRunner.manager.findOne(PayrollCorrection, {
        where: { id: correctionId, company_id: companyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!targetCorrection) {
        throw new NotFoundException('Payroll correction not found');
      }

      if (targetCorrection.status !== PayrollCorrectionStatus.APPLIED) {
        throw new BadRequestException('Only APPLIED corrections can be reversed');
      }

      const rec = await queryRunner.manager.findOne(PayrollRecord, {
        where: { id: targetCorrection.payroll_record_id, company_id: companyId },
      });

      if (!rec) {
        throw new NotFoundException('Payroll record not found');
      }

      const period = await queryRunner.manager.findOne(PayrollPeriod, {
        where: { id: rec.payroll_period_id, company_id: companyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!period) {
        throw new NotFoundException('Payroll period not found');
      }

      if (
        period.status === PayrollPeriodStatus.PAID ||
        rec.status === PayrollRecordStatus.PAID
      ) {
        throw new BadRequestException(
          'Paid payroll is immutable and cannot be modified.',
        );
      }

      const employee = await queryRunner.manager.findOne(Employee, {
        where: { id: rec.employee_id, company_id: companyId },
      });

      const originalAmountNum = Number(targetCorrection.amount);
      const reversedAmountStr = (-originalAmountNum).toFixed(2);

      const reversalCorrection = queryRunner.manager.create(PayrollCorrection, {
        company_id: companyId,
        payroll_record_id: targetCorrection.payroll_record_id,
        employee_id: targetCorrection.employee_id,
        correction_type: PayrollCorrectionType.ABSENCE_DEDUCTION_REVERSAL,
        amount: reversedAmountStr,
        reason: `Reversal of correction ${targetCorrection.id}: ${dto.reason.trim()}`,
        status: PayrollCorrectionStatus.APPLIED,
        created_by: userId,
        approved_by: userId,
        applied_at: new Date(),
        reversal_correction_id: targetCorrection.id,
      });

      const savedReversal = await queryRunner.manager.save(reversalCorrection);

      targetCorrection.status = PayrollCorrectionStatus.REVERSED;
      targetCorrection.reversed_at = new Date();
      targetCorrection.reversal_correction_id = savedReversal.id;
      await queryRunner.manager.save(targetCorrection);

      // Compute adjusted net pay after reversal
      const allApplied = await queryRunner.manager.find(PayrollCorrection, {
        where: {
          company_id: companyId,
          payroll_record_id: targetCorrection.payroll_record_id,
          status: PayrollCorrectionStatus.APPLIED,
        },
      });

      let totalCents = 0;
      for (const c of allApplied) {
        totalCents += Math.round(Number(c.amount) * 100);
      }

      const originalCents = Math.round(Number(rec.net_salary) * 100);
      const adjustedNetStr = ((originalCents + totalCents) / 100).toFixed(2);

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'PAYROLL_CORRECTION_REVERSED',
        entityType: 'PAYROLL_CORRECTION',
        entityId: targetCorrection.id,
        metadata: {
          payrollRecordId: rec.id,
          employeeId: targetCorrection.employee_id,
          employeeCode: employee?.employee_code,
          employeeName: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
          originalCorrectionId: targetCorrection.id,
          reversalCorrectionId: savedReversal.id,
          reversalAmount: savedReversal.amount,
          reason: dto.reason.trim(),
          originalNetPay: rec.net_salary,
          adjustedNetPay: adjustedNetStr,
        },
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();

      return this.correctionRepository.findOne({
        where: { id: savedReversal.id, company_id: companyId },
        relations: { employee: true, created_by_user: true },
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
