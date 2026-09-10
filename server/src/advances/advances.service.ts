import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeAdvance, AdvanceStatus } from './entities/employee-advance.entity.js';
import { AdvanceRepayment } from './entities/advance-repayment.entity.js';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateAdvanceDto } from './dto/create-advance.dto.js';
import { UpdateAdvanceStatusDto } from './dto/update-advance-status.dto.js';
import { AdvanceQueryDto } from './dto/advance-query.dto.js';

@Injectable()
export class AdvancesService {
  constructor(
    @InjectRepository(EmployeeAdvance)
    private readonly advanceRepository: Repository<EmployeeAdvance>,
    @InjectRepository(AdvanceRepayment)
    private readonly repaymentRepository: Repository<AdvanceRepayment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private async generateAdvanceNumber(companyId: string): Promise<string> {
    const count = await this.advanceRepository.count({
      where: { company_id: companyId },
    });
    const nextNum = (count + 1).toString().padStart(6, '0');
    return `ADV-${nextNum}`;
  }

  async createAdvance(
    companyId: string,
    userId: string,
    employeeId: string,
    dto: CreateAdvanceDto,
  ) {
    const amountNum = parseFloat(dto.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('Invalid advance amount');
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.employment_status === EmploymentStatus.TERMINATED) {
      throw new BadRequestException(
        'Cannot create advance for a terminated employee',
      );
    }

    const advanceNumber = await this.generateAdvanceNumber(companyId);

    const advance = this.advanceRepository.create({
      company_id: companyId,
      employee_id: employeeId,
      advance_number: advanceNumber,
      amount: Number(amountNum).toFixed(2),
      advance_date: dto.advanceDate,
      reason: dto.reason,
      notes: dto.notes,
      status: AdvanceStatus.ACTIVE,
      created_by: userId,
    });

    const saved = await this.advanceRepository.save(advance);

    await this.auditLogsService.logAction({
      companyId,
      userId,
      action: 'ADVANCE_CREATE',
      entityType: 'SALARY_ADVANCE',
      entityId: saved.id,
      metadata: {
        advanceNumber: saved.advance_number,
        employeeId,
        employeeName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
        employeeCode: employee.employee_code,
        amount: saved.amount,
        advanceDate: saved.advance_date,
        reason: saved.reason,
      },
    });

    return this.getAdvanceById(companyId, saved.id);
  }

  async getAdvances(
    companyId: string,
    employeeId: string,
    query?: AdvanceQueryDto,
  ) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const qb = this.advanceRepository
      .createQueryBuilder('adv')
      .where('adv.company_id = :companyId', { companyId })
      .andWhere('adv.employee_id = :employeeId', { employeeId });

    if (query?.status) {
      qb.andWhere('adv.status = :status', { status: query.status });
    }

    qb.orderBy('adv.advance_date', 'DESC').addOrderBy('adv.created_at', 'DESC');

    return qb.getMany();
  }

  async getAdvanceById(companyId: string, id: string) {
    const advance = await this.advanceRepository.findOne({
      where: { id, company_id: companyId },
      relations: { employee: true },
    });

    if (!advance) {
      throw new NotFoundException('Advance not found');
    }

    const repayments = await this.repaymentRepository.find({
      where: { company_id: companyId, advance_id: id },
    });
    const totalRepaid = repayments.reduce(
      (sum, r) => sum + parseFloat(r.amount || '0'),
      0,
    );
    const outstandingNum = Math.max(0, parseFloat(advance.amount) - totalRepaid);

    return {
      ...advance,
      outstandingBalance: outstandingNum.toFixed(2),
    };
  }

  async updateAdvanceStatus(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateAdvanceStatusDto,
  ) {
    const advance = await this.advanceRepository.findOne({
      where: { id, company_id: companyId },
      relations: { employee: true },
    });

    if (!advance) {
      throw new NotFoundException('Advance not found');
    }

    advance.status = dto.status;
    const saved = await this.advanceRepository.save(advance);

    await this.auditLogsService.logAction({
      companyId,
      userId,
      action: 'ADVANCE_STATUS_UPDATE',
      entityType: 'SALARY_ADVANCE',
      entityId: saved.id,
      metadata: {
        advanceNumber: saved.advance_number,
        employeeId: saved.employee_id,
        employeeName: saved.employee
          ? `${saved.employee.first_name || ''} ${saved.employee.last_name || ''}`.trim()
          : undefined,
        employeeCode: saved.employee?.employee_code,
        status: saved.status,
        amount: saved.amount,
      },
    });

    return this.getAdvanceById(companyId, id);
  }
}
