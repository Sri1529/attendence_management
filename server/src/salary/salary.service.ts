import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EmployeeSalaryHistory } from './entities/employee-salary-history.entity.js';
import { SalaryAdjustment, AdjustmentStatus } from './entities/salary-adjustment.entity.js';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity.js';
import { CreateSalaryDto } from './dto/create-salary.dto.js';
import { UpdateSalaryDto } from './dto/update-salary.dto.js';
import { CorrectSalaryDto } from './dto/correct-salary.dto.js';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto.js';
import { UpdateAdjustmentStatusDto } from './dto/update-adjustment-status.dto.js';
import { PayrollRecord } from '../payroll/entities/payroll-record.entity.js';
import { PayrollPeriodStatus } from '../payroll/entities/payroll-period.entity.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class SalaryService {
  constructor(
    @InjectRepository(EmployeeSalaryHistory)
    private readonly salaryHistoryRepository: Repository<EmployeeSalaryHistory>,
    @InjectRepository(SalaryAdjustment)
    private readonly adjustmentRepository: Repository<SalaryAdjustment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private getDayBefore(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split('T')[0];
  }

  async createSalary(
    companyId: string,
    userId: string,
    employeeId: string,
    dto: CreateSalaryDto,
  ) {
    const amountNum = parseFloat(dto.basicSalary);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('Invalid salary amount');
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock employee row to serialize salary creation for this employee
      await queryRunner.manager.findOne(Employee, {
        where: { id: employeeId, company_id: companyId },
        lock: { mode: 'pessimistic_write' },
      });

      // Get existing salary records sorted by effective_from ASC
      const existingRecords = await queryRunner.manager.find(EmployeeSalaryHistory, {
        where: { company_id: companyId, employee_id: employeeId },
        order: { effective_from: 'ASC', created_at: 'ASC' },
      });

      // Validate non-overlapping timeline: new effectiveFrom must be after existing record periods
      const overlap = existingRecords.find((r) => {
        if (r.effective_from === dto.effectiveFrom) return true;
        if (r.effective_from < dto.effectiveFrom && r.effective_to && dto.effectiveFrom <= r.effective_to) return true;
        if (r.effective_from > dto.effectiveFrom) return true;
        return false;
      });

      if (overlap) {
        throw new BadRequestException('Overlapping salary effective date');
      }

      // Find active/previous record immediately before dto.effectiveFrom
      const prevRecord = existingRecords
        .filter((r) => r.effective_from < dto.effectiveFrom)
        .pop();

      // Close the previous active record if it exists
      if (prevRecord) {
        prevRecord.effective_to = this.getDayBefore(dto.effectiveFrom);
        await queryRunner.manager.save(prevRecord);
      }

      const newSalary = queryRunner.manager.create(EmployeeSalaryHistory, {
        company_id: companyId,
        employee_id: employeeId,
        basic_salary: Number(amountNum).toFixed(2),
        effective_from: dto.effectiveFrom,
        effective_to: null,
        notes: dto.notes,
        created_by: userId,
      });

      const saved = await queryRunner.manager.save(newSalary);
      await queryRunner.commitTransaction();

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'SALARY_CREATE',
        entityType: 'SALARY',
        entityId: saved.id,
        metadata: {
          employeeName: `${employee.first_name} ${employee.last_name}`,
          basicSalary: saved.basic_salary,
          effectiveFrom: saved.effective_from,
        },
      });

      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getCurrentSalary(
    companyId: string,
    employeeId: string,
    targetDate?: string,
  ) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const date = targetDate || new Date().toISOString().split('T')[0];

    const current = await this.salaryHistoryRepository
      .createQueryBuilder('sh')
      .where('sh.company_id = :companyId', { companyId })
      .andWhere('sh.employee_id = :employeeId', { employeeId })
      .andWhere('sh.effective_from <= :date', { date })
      .andWhere('(sh.effective_to IS NULL OR sh.effective_to >= :date)', { date })
      .orderBy('sh.effective_from', 'DESC')
      .addOrderBy('sh.created_at', 'DESC')
      .getOne();

    if (!current) {
      throw new NotFoundException('No active salary found for this date');
    }

    return current;
  }

  async getSalaryHistory(companyId: string, employeeId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.salaryHistoryRepository.find({
      where: { company_id: companyId, employee_id: employeeId },
      order: { effective_from: 'DESC', created_at: 'DESC' },
    });
  }

  async updateSalaryHistoryNotes(
    companyId: string,
    salaryId: string,
    dto: UpdateSalaryDto,
  ) {
    const salary = await this.salaryHistoryRepository.findOne({
      where: { id: salaryId, company_id: companyId },
    });

    if (!salary) {
      throw new NotFoundException('Salary record not found');
    }

    if (dto.notes !== undefined) {
      salary.notes = dto.notes;
    }

    return this.salaryHistoryRepository.save(salary);
  }

  async createAdjustment(
    companyId: string,
    userId: string,
    employeeId: string,
    dto: CreateAdjustmentDto,
  ) {
    const amountNum = parseFloat(dto.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('Invalid adjustment amount');
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.employment_status === EmploymentStatus.TERMINATED) {
      throw new BadRequestException(
        'Cannot create salary adjustment for a terminated employee',
      );
    }

    const adjustment = this.adjustmentRepository.create({
      company_id: companyId,
      employee_id: employeeId,
      adjustment_type: dto.adjustmentType,
      amount: Number(amountNum).toFixed(2),
      adjustment_date: dto.adjustmentDate,
      description: dto.description,
      status: AdjustmentStatus.ACTIVE,
      created_by: userId,
    });

    const saved = await this.adjustmentRepository.save(adjustment);

    await this.auditLogsService.logAction({
      companyId,
      userId,
      action: 'SALARY_ADJUSTMENT_CREATE',
      entityType: 'SALARY_ADJUSTMENT',
      entityId: saved.id,
      metadata: {
        employeeName: `${employee.first_name} ${employee.last_name}`,
        adjustmentType: saved.adjustment_type,
        amount: saved.amount,
      },
    });

    return saved;
  }

  async getAdjustments(companyId: string, employeeId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.adjustmentRepository.find({
      where: { company_id: companyId, employee_id: employeeId },
      order: { adjustment_date: 'DESC', created_at: 'DESC' },
    });
  }

  async updateAdjustmentStatus(
    companyId: string,
    adjustmentId: string,
    dto: UpdateAdjustmentStatusDto,
  ) {
    const adjustment = await this.adjustmentRepository.findOne({
      where: { id: adjustmentId, company_id: companyId },
    });

    if (!adjustment) {
      throw new NotFoundException('Adjustment record not found');
    }

    adjustment.status = dto.status;
    return this.adjustmentRepository.save(adjustment);
  }

  async correctSalaryHistory(
    companyId: string,
    userId: string,
    id: string,
    dto: CorrectSalaryDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const targetSalary = await queryRunner.manager.findOne(
        EmployeeSalaryHistory,
        {
          where: { id, company_id: companyId },
          relations: { employee: true },
        },
      );

      if (!targetSalary) {
        throw new NotFoundException('Salary record not found');
      }

      await queryRunner.manager.findOne(Employee, {
        where: { id: targetSalary.employee_id, company_id: companyId },
        lock: { mode: 'pessimistic_write' },
      });

      // Payroll protection check
      const payrollRecords = await queryRunner.manager
        .createQueryBuilder(PayrollRecord, 'pr')
        .innerJoinAndSelect('pr.payroll_period', 'pp')
        .where('pr.company_id = :companyId', { companyId })
        .andWhere('pr.employee_id = :employeeId', {
          employeeId: targetSalary.employee_id,
        })
        .getMany();

      for (const pr of payrollRecords) {
        const periodStatus = pr.payroll_period.status;
        if (
          periodStatus === PayrollPeriodStatus.FINALIZED ||
          periodStatus === PayrollPeriodStatus.PAID
        ) {
          const pStart = pr.payroll_period.start_date;
          const pEnd = pr.payroll_period.end_date;

          const wasEffective =
            targetSalary.effective_from <= pEnd &&
            (!targetSalary.effective_to ||
              targetSalary.effective_to >= pStart);

          if (wasEffective) {
            throw new ConflictException(
              'Salary record cannot be corrected because it has been used by a finalized or paid payroll.',
            );
          }
        }
      }

      // Remove DRAFT payroll records for this employee so they recalculate with corrected salary
      const draftRecords = payrollRecords.filter(
        (pr) => pr.payroll_period.status === PayrollPeriodStatus.DRAFT,
      );
      for (const dr of draftRecords) {
        await queryRunner.manager.remove(PayrollRecord, dr);
      }

      const previousBasicSalary = targetSalary.basic_salary;
      const previousEffectiveFrom = targetSalary.effective_from;
      const previousNotes = targetSalary.notes;

      const newBasicSalary =
        dto.basicSalary !== undefined
          ? dto.basicSalary
          : targetSalary.basic_salary;
      const newEffectiveFrom =
        dto.effectiveFrom !== undefined
          ? dto.effectiveFrom
          : targetSalary.effective_from;
      const newNotes = dto.notes !== undefined ? dto.notes : targetSalary.notes;

      const amountNum = parseFloat(newBasicSalary);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new BadRequestException('Invalid salary amount');
      }

      const allRecords = await queryRunner.manager.find(
        EmployeeSalaryHistory,
        {
          where: {
            company_id: companyId,
            employee_id: targetSalary.employee_id,
          },
          order: { effective_from: 'ASC', created_at: 'ASC' },
        },
      );

      // Update target record properties in memory and in allRecords array
      targetSalary.basic_salary = Number(amountNum).toFixed(2);
      targetSalary.effective_from = newEffectiveFrom;
      targetSalary.notes = newNotes;

      const idx = allRecords.findIndex((r) => r.id === targetSalary.id);
      if (idx !== -1) {
        allRecords[idx].basic_salary = targetSalary.basic_salary;
        allRecords[idx].effective_from = targetSalary.effective_from;
        allRecords[idx].notes = targetSalary.notes;
      }

      // Check if newEffectiveFrom conflicts with another record's effective_from
      const duplicate = allRecords.find(
        (r) => r.id !== targetSalary.id && r.effective_from === newEffectiveFrom,
      );
      if (duplicate) {
        throw new BadRequestException('Overlapping salary effective date');
      }

      // Re-sort all records by effective_from ASC
      const sortedRecords = [...allRecords].sort((a, b) =>
        a.effective_from.localeCompare(b.effective_from),
      );

      // Re-chain timeline & validate continuity
      for (let i = 0; i < sortedRecords.length; i++) {
        const curr = sortedRecords[i];
        const next = sortedRecords[i + 1];

        if (next) {
          curr.effective_to = this.getDayBefore(next.effective_from);
          if (curr.effective_to < curr.effective_from) {
            throw new BadRequestException('Overlapping salary effective date');
          }
        } else {
          curr.effective_to = null;
        }

        await queryRunner.manager.save(curr);
      }

      const empName = targetSalary.employee
        ? `${targetSalary.employee.first_name} ${targetSalary.employee.last_name}`.trim()
        : '';

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'SALARY_RECORD_CORRECTED',
        entityType: 'SALARY',
        entityId: targetSalary.id,
        metadata: {
          salaryHistoryId: targetSalary.id,
          employeeId: targetSalary.employee_id,
          employeeName: empName,
          previousBasicSalary,
          newBasicSalary: targetSalary.basic_salary,
          previousEffectiveFrom,
          newEffectiveFrom: targetSalary.effective_from,
          previousNotes: previousNotes || null,
          newNotes: targetSalary.notes || null,
        },
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();

      return this.salaryHistoryRepository.findOne({
        where: { id, company_id: companyId },
        relations: { employee: true },
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
