import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeLoan, LoanStatus } from './entities/employee-loan.entity.js';
import { LoanRepayment } from './entities/loan-repayment.entity.js';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { LoanQueryDto } from './dto/loan-query.dto.js';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(EmployeeLoan)
    private readonly loanRepository: Repository<EmployeeLoan>,
    @InjectRepository(LoanRepayment)
    private readonly repaymentRepository: Repository<LoanRepayment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private async generateLoanNumber(companyId: string, loanDate: string): Promise<string> {
    const year = loanDate ? new Date(loanDate).getFullYear() : new Date().getFullYear();
    const count = await this.loanRepository.count({
      where: { company_id: companyId },
    });
    const nextNum = (count + 1).toString().padStart(6, '0');
    return `LN-${year}-${nextNum}`;
  }

  async createLoan(
    companyId: string,
    userId: string,
    dto: CreateLoanDto,
  ): Promise<EmployeeLoan> {
    const amountNum = parseFloat(dto.principalAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('Invalid loan amount');
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found in your company');
    }

    if (employee.employment_status === EmploymentStatus.TERMINATED) {
      throw new BadRequestException(
        'Cannot create loan for a terminated employee',
      );
    }

    const activeLoan = await this.loanRepository.findOne({
      where: {
        company_id: companyId,
        employee_id: dto.employeeId,
        status: LoanStatus.ACTIVE,
      },
    });

    if (activeLoan) {
      throw new BadRequestException(
        `Employee already has an active loan (${activeLoan.loan_number}) with outstanding balance ₹${parseFloat(activeLoan.outstanding_amount).toLocaleString('en-IN')}. Please settle or complete it before issuing a new loan.`,
      );
    }

    const loanNumber = await this.generateLoanNumber(companyId, dto.loanDate);

    const loan = this.loanRepository.create({
      company_id: companyId,
      employee_id: dto.employeeId,
      loan_number: loanNumber,
      principal_amount: amountNum.toFixed(2),
      outstanding_amount: amountNum.toFixed(2),
      loan_date: dto.loanDate,
      start_repayment_date: dto.startRepaymentDate || null,
      reason: dto.reason || null,
      notes: dto.notes || null,
      status: LoanStatus.ACTIVE,
      created_by: userId,
    });

    const saved = await this.loanRepository.save(loan);

    await this.auditLogsService.logAction({
      companyId,
      userId,
      action: 'LOAN_CREATED',
      entityType: 'LOAN',
      entityId: saved.id,
      metadata: {
        employeeId: dto.employeeId,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        loanNumber,
        principalAmount: amountNum.toFixed(2),
        outstandingAmount: amountNum.toFixed(2),
        loanDate: dto.loanDate,
      },
    });

    return this.findOne(companyId, saved.id);
  }

  async findAll(companyId: string, query: LoanQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.loanRepository
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.employee', 'emp')
      .where('l.company_id = :companyId', { companyId });

    if (query.employeeId) {
      qb.andWhere('l.employee_id = :employeeId', { employeeId: query.employeeId });
    }

    if (query.status) {
      qb.andWhere('l.status = :status', { status: query.status });
    }

    if (query.search) {
      const search = `%${query.search}%`;
      qb.andWhere(
        '(l.loan_number ILIKE :search OR emp.first_name ILIKE :search OR emp.last_name ILIKE :search OR emp.employee_code ILIKE :search)',
        { search },
      );
    }

    qb.orderBy('l.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(companyId: string, id: string): Promise<EmployeeLoan> {
    const loan = await this.loanRepository.findOne({
      where: { id, company_id: companyId },
      relations: {
        employee: true,
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan record not found');
    }

    return loan;
  }

  async cancelLoan(
    companyId: string,
    userId: string,
    id: string,
    notes?: string,
  ): Promise<EmployeeLoan> {
    const loan = await this.findOne(companyId, id);

    if (loan.status === LoanStatus.CANCELLED) {
      throw new BadRequestException('Loan is already cancelled');
    }

    const repaymentsCount = await this.repaymentRepository.count({
      where: { company_id: companyId, loan_id: id },
    });

    if (repaymentsCount > 0) {
      throw new BadRequestException(
        'Cannot cancel a loan that already has committed repayments',
      );
    }

    loan.status = LoanStatus.CANCELLED;
    if (notes) loan.notes = notes;

    const saved = await this.loanRepository.save(loan);

    await this.auditLogsService.logAction({
      companyId,
      userId,
      action: 'LOAN_CANCELLED',
      entityType: 'LOAN',
      entityId: saved.id,
      metadata: {
        loanNumber: saved.loan_number,
        employeeId: saved.employee_id,
        notes,
      },
    });

    return saved;
  }

  async getRepayments(companyId: string, loanId: string): Promise<LoanRepayment[]> {
    await this.findOne(companyId, loanId); // ensures loan exists & scoped to company

    return this.repaymentRepository.find({
      where: { company_id: companyId, loan_id: loanId },
      relations: {
        payroll_record: {
          payroll_period: true,
        },
      },
      order: {
        repayment_date: 'DESC',
        created_at: 'DESC',
      },
    });
  }

  async findEmployeeLoans(companyId: string, employeeId: string) {
    return this.loanRepository.find({
      where: { company_id: companyId, employee_id: employeeId },
      order: { created_at: 'DESC' },
    });
  }
}
