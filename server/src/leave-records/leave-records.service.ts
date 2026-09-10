import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { LeaveRecord, LeaveStatus } from './entities/leave-record.entity.js';
import { LeaveType, LeaveTypeStatus } from '../leave-types/entities/leave-type.entity.js';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity.js';
import { Attendance, AttendanceStatus } from '../attendance/entities/attendance.entity.js';
import { PayrollPeriod, PayrollPeriodStatus } from '../payroll/entities/payroll-period.entity.js';
import { CreateLeaveRecordDto } from './dto/create-leave-record.dto.js';
import { UpdateLeaveRecordDto } from './dto/update-leave-record.dto.js';
import { UpdateLeaveRecordStatusDto } from './dto/update-leave-record-status.dto.js';
import { LeaveRecordQueryDto } from './dto/leave-record-query.dto.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

function generateDateRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
  const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);

  const current = new Date(Date.UTC(sYear, sMonth - 1, sDay));
  const end = new Date(Date.UTC(eYear, eMonth - 1, eDay));

  while (current <= end) {
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, '0');
    const day = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

@Injectable()
export class LeaveRecordsService {
  constructor(
    @InjectRepository(LeaveRecord)
    private readonly leaveRecordRepository: Repository<LeaveRecord>,
    @InjectRepository(LeaveType)
    private readonly leaveTypeRepository: Repository<LeaveType>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly auditLogsService: AuditLogsService,
    private readonly dataSource: DataSource,
  ) {}

  private async checkPayrollLockForLeave(
    queryRunner: QueryRunner,
    companyId: string,
    startDate: string,
    endDate: string,
  ) {
    const lockedPeriod = await queryRunner.manager
      .createQueryBuilder(PayrollPeriod, 'pp')
      .setLock('pessimistic_write')
      .where('pp.company_id = :companyId', { companyId })
      .andWhere('pp.status IN (:...statuses)', {
        statuses: [PayrollPeriodStatus.FINALIZED, PayrollPeriodStatus.PAID],
      })
      .andWhere('pp.start_date <= :endDate AND pp.end_date >= :startDate', {
        startDate,
        endDate,
      })
      .getOne();

    if (lockedPeriod) {
      if (lockedPeriod.status === PayrollPeriodStatus.PAID) {
        throw new BadRequestException(
          'This leave is locked because it has been included in a paid payroll and cannot be cancelled.',
        );
      }
      if (lockedPeriod.status === PayrollPeriodStatus.FINALIZED) {
        throw new BadRequestException(
          'This leave is locked because it has been included in a finalized payroll. Reopen the payroll for correction before changing this leave.',
        );
      }
    }
  }

  private async syncAttendanceForApprovedLeave(
    queryRunner: QueryRunner,
    companyId: string,
    employeeId: string,
    startDateStr: string,
    endDateStr: string,
    leaveRecordId: string,
    userId: string,
  ) {
    const dates = generateDateRange(startDateStr, endDateStr);
    const employee = await queryRunner.manager.findOne(Employee, {
      where: { id: employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    for (const date of dates) {
      if (employee.joining_date && date < employee.joining_date) {
        continue;
      }
      if (
        employee.employment_status === EmploymentStatus.TERMINATED &&
        employee.updated_at &&
        date > employee.updated_at.toISOString().split('T')[0]
      ) {
        continue;
      }

      const existing = await queryRunner.manager.findOne(Attendance, {
        where: {
          company_id: companyId,
          employee_id: employeeId,
          attendance_date: date,
        },
      });

      if (!existing) {
        const att = queryRunner.manager.create(Attendance, {
          company_id: companyId,
          employee_id: employeeId,
          attendance_date: date,
          status: AttendanceStatus.LEAVE,
          leave_record_id: leaveRecordId,
          remarks: 'Auto-synchronized from approved leave',
          created_by: userId,
          updated_by: userId,
        });
        const savedAtt = await queryRunner.manager.save(att);
        await this.auditLogsService.logAction({
          companyId,
          userId,
          action: 'ATTENDANCE_LEAVE_SYNC',
          entityType: 'ATTENDANCE',
          entityId: savedAtt.id,
          metadata: {
            employeeId,
            employeeName: `${employee.first_name} ${employee.last_name}`,
            attendanceDate: date,
            status: AttendanceStatus.LEAVE,
            leaveRecordId,
          },
          entityManager: queryRunner.manager,
        });
      } else {
        if (existing.status === AttendanceStatus.ABSENT) {
          existing.status = AttendanceStatus.LEAVE;
          existing.leave_record_id = leaveRecordId;
          existing.remarks = 'Auto-synchronized from approved leave (was ABSENT)';
          existing.updated_by = userId;
          await queryRunner.manager.save(existing);
          await this.auditLogsService.logAction({
            companyId,
            userId,
            action: 'ATTENDANCE_LEAVE_SYNC',
            entityType: 'ATTENDANCE',
            entityId: existing.id,
            metadata: {
              employeeId,
              employeeName: `${employee.first_name} ${employee.last_name}`,
              attendanceDate: date,
              status: AttendanceStatus.LEAVE,
              previousStatus: AttendanceStatus.ABSENT,
              leaveRecordId,
            },
            entityManager: queryRunner.manager,
          });
        } else if (existing.status === AttendanceStatus.LEAVE) {
          if (!existing.leave_record_id) {
            existing.leave_record_id = leaveRecordId;
            await queryRunner.manager.save(existing);
          }
          continue;
        } else if (existing.status === AttendanceStatus.PRESENT) {
          throw new BadRequestException(
            `Attendance conflict: Employee has PRESENT attendance on ${date}`,
          );
        } else if (existing.status === AttendanceStatus.HALF_DAY) {
          throw new BadRequestException(
            `Attendance conflict: Employee has HALF_DAY attendance on ${date}`,
          );
        } else if (existing.status === AttendanceStatus.HOLIDAY) {
          continue;
        }
      }
    }
  }

  private async reconcileAttendanceForCancelledLeave(
    queryRunner: QueryRunner,
    companyId: string,
    employeeId: string,
    startDateStr: string,
    endDateStr: string,
    leaveRecordId: string,
    userId: string,
  ) {
    const dates = generateDateRange(startDateStr, endDateStr);
    for (const date of dates) {
      const existing = await queryRunner.manager.findOne(Attendance, {
        where: {
          company_id: companyId,
          employee_id: employeeId,
          attendance_date: date,
        },
      });

      if (
        existing &&
        (existing.leave_record_id === leaveRecordId || existing.status === AttendanceStatus.LEAVE)
      ) {
        if (existing.remarks?.includes('(was ABSENT)')) {
          existing.status = AttendanceStatus.ABSENT;
          existing.leave_record_id = null;
          existing.remarks = 'Reverted from cancelled leave';
          existing.updated_by = userId;
          await queryRunner.manager.save(existing);
        } else if (
          existing.leave_record_id === leaveRecordId ||
          existing.remarks?.includes('Auto-synchronized from approved leave')
        ) {
          await queryRunner.manager.remove(existing);
        }
      }
    }
  }

  async create(companyId: string, userId: string, dto: CreateLeaveRecordDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const employee = await queryRunner.manager.findOne(Employee, {
        where: { id: dto.employeeId, company_id: companyId },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      if (employee.employment_status === EmploymentStatus.TERMINATED) {
        throw new BadRequestException(
          'Cannot record leave for a terminated employee',
        );
      }

      const leaveType = await queryRunner.manager.findOne(LeaveType, {
        where: { id: dto.leaveTypeId, company_id: companyId },
      });

      if (!leaveType || leaveType.status !== LeaveTypeStatus.ACTIVE) {
        throw new BadRequestException(
          'Invalid or inactive leave type for this company',
        );
      }

      if (dto.startDate > dto.endDate) {
        throw new BadRequestException('End date cannot be before start date');
      }

      const overlap = await queryRunner.manager
        .createQueryBuilder(LeaveRecord, 'lr')
        .where('lr.company_id = :companyId', { companyId })
        .andWhere('lr.employee_id = :employeeId', { employeeId: dto.employeeId })
        .andWhere('lr.status IN (:...statuses)', {
          statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
        })
        .andWhere('lr.start_date <= :endDate AND lr.end_date >= :startDate', {
          startDate: dto.startDate,
          endDate: dto.endDate,
        })
        .getOne();

      if (overlap) {
        throw new BadRequestException('Overlapping leave request exists');
      }

      if ((dto.status || LeaveStatus.PENDING) === LeaveStatus.APPROVED) {
        await this.checkPayrollLockForLeave(
          queryRunner,
          companyId,
          dto.startDate,
          dto.endDate,
        );
      }

      const record = queryRunner.manager.create(LeaveRecord, {
        company_id: companyId,
        employee_id: dto.employeeId,
        leave_type_id: dto.leaveTypeId,
        start_date: dto.startDate,
        end_date: dto.endDate,
        status: dto.status || LeaveStatus.PENDING,
        remarks: dto.remarks,
        is_paid: dto.is_paid !== undefined ? dto.is_paid : null,
        created_by: userId,
        updated_by: userId,
      });

      const saved = await queryRunner.manager.save(record);

      if (saved.status === LeaveStatus.APPROVED) {
        await this.syncAttendanceForApprovedLeave(
          queryRunner,
          companyId,
          saved.employee_id,
          saved.start_date,
          saved.end_date,
          saved.id,
          userId,
        );
      }

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'LEAVE_RECORD_CREATE',
        entityType: 'LEAVE_RECORD',
        entityId: saved.id,
        metadata: {
          employeeName: `${employee.first_name} ${employee.last_name}`,
          leaveType: leaveType.name,
          startDate: saved.start_date,
          endDate: saved.end_date,
        },
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();
      return this.findOne(companyId, saved.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(companyId: string, query: LeaveRecordQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.leaveRecordRepository
      .createQueryBuilder('lr')
      .leftJoinAndSelect('lr.employee', 'employee')
      .leftJoinAndSelect('lr.leave_type', 'leave_type')
      .where('lr.company_id = :companyId', { companyId });

    if (query.employeeId) {
      qb.andWhere('lr.employee_id = :employeeId', {
        employeeId: query.employeeId,
      });
    }

    if (query.status) {
      qb.andWhere('lr.status = :status', { status: query.status });
    }

    qb.orderBy('lr.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    const lockedPeriods = await this.dataSource.getRepository(PayrollPeriod).find({
      where: {
        company_id: companyId,
        status: In([PayrollPeriodStatus.FINALIZED, PayrollPeriodStatus.PAID]),
      },
      select: { id: true, start_date: true, end_date: true, status: true },
    });

    const enrichedData = data.map((record) => {
      let isPayrollLocked = false;
      let payrollLockStatus: 'FINALIZED' | 'PAID' | null = null;
      let payrollLockMessage: string | null = null;

      if (record.status === LeaveStatus.APPROVED) {
        const matchingPeriod = lockedPeriods.find(
          (p) => p.start_date <= record.end_date && p.end_date >= record.start_date,
        );
        if (matchingPeriod) {
          isPayrollLocked = true;
          if (matchingPeriod.status === PayrollPeriodStatus.PAID) {
            payrollLockStatus = 'PAID';
            payrollLockMessage =
              'This leave is part of a paid payroll and cannot be modified.';
          } else if (matchingPeriod.status === PayrollPeriodStatus.FINALIZED) {
            payrollLockStatus = 'FINALIZED';
            payrollLockMessage =
              'This leave is part of a finalized payroll. Reopen the payroll for correction before changing it.';
          }
        }
      }

      return {
        ...record,
        isPayrollLocked,
        payrollLockStatus,
        payrollLockMessage,
      };
    });

    return {
      data: enrichedData,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const record = await this.leaveRecordRepository.findOne({
      where: { id, company_id: companyId },
      relations: { employee: true, leave_type: true },
    });

    if (!record) {
      throw new NotFoundException('Leave record not found');
    }

    let isPayrollLocked = false;
    let payrollLockStatus: 'FINALIZED' | 'PAID' | null = null;
    let payrollLockMessage: string | null = null;

    if (record.status === LeaveStatus.APPROVED) {
      const matchingPeriod = await this.dataSource
        .getRepository(PayrollPeriod)
        .createQueryBuilder('pp')
        .where('pp.company_id = :companyId', { companyId })
        .andWhere('pp.status IN (:...statuses)', {
          statuses: [PayrollPeriodStatus.FINALIZED, PayrollPeriodStatus.PAID],
        })
        .andWhere('pp.start_date <= :endDate AND pp.end_date >= :startDate', {
          startDate: record.start_date,
          endDate: record.end_date,
        })
        .getOne();

      if (matchingPeriod) {
        isPayrollLocked = true;
        if (matchingPeriod.status === PayrollPeriodStatus.PAID) {
          payrollLockStatus = 'PAID';
          payrollLockMessage =
            'This leave is part of a paid payroll and cannot be modified.';
        } else if (matchingPeriod.status === PayrollPeriodStatus.FINALIZED) {
          payrollLockStatus = 'FINALIZED';
          payrollLockMessage =
            'This leave is part of a finalized payroll. Reopen the payroll for correction before changing it.';
        }
      }
    }

    return {
      ...record,
      isPayrollLocked,
      payrollLockStatus,
      payrollLockMessage,
    };
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateLeaveRecordDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const record = await queryRunner.manager.findOne(LeaveRecord, {
        where: { id, company_id: companyId },
        relations: { employee: true, leave_type: true },
      });

      if (!record) {
        throw new NotFoundException('Leave record not found');
      }

      const oldStatus = record.status;
      const oldStartDate = record.start_date;
      const oldEndDate = record.end_date;
      const oldIsPaid = record.is_paid;

      const targetStartDate = dto.startDate || record.start_date;
      const targetEndDate = dto.endDate || record.end_date;

      if (record.status === LeaveStatus.APPROVED || dto.status === LeaveStatus.APPROVED) {
        await this.checkPayrollLockForLeave(
          queryRunner,
          companyId,
          record.start_date,
          record.end_date,
        );
        if (targetStartDate !== record.start_date || targetEndDate !== record.end_date) {
          await this.checkPayrollLockForLeave(
            queryRunner,
            companyId,
            targetStartDate,
            targetEndDate,
          );
        }
      }

      if (dto.leaveTypeId && dto.leaveTypeId !== record.leave_type_id) {
        const leaveType = await queryRunner.manager.findOne(LeaveType, {
          where: { id: dto.leaveTypeId, company_id: companyId },
        });
        if (!leaveType || leaveType.status !== LeaveTypeStatus.ACTIVE) {
          throw new BadRequestException(
            'Invalid or inactive leave type for this company',
          );
        }
        record.leave_type_id = dto.leaveTypeId;
      }

      const startDate = dto.startDate || record.start_date;
      const endDate = dto.endDate || record.end_date;

      if (startDate > endDate) {
        throw new BadRequestException('End date cannot be before start date');
      }

      if (dto.startDate || dto.endDate) {
        const overlap = await queryRunner.manager
          .createQueryBuilder(LeaveRecord, 'lr')
          .where('lr.company_id = :companyId', { companyId })
          .andWhere('lr.employee_id = :employeeId', {
            employeeId: record.employee_id,
          })
          .andWhere('lr.id != :id', { id })
          .andWhere('lr.status IN (:...statuses)', {
            statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
          })
          .andWhere('lr.start_date <= :endDate AND lr.end_date >= :startDate', {
            startDate,
            endDate,
          })
          .getOne();

        if (overlap) {
          throw new BadRequestException('Overlapping leave request exists');
        }

        record.start_date = startDate;
        record.end_date = endDate;
      }

      if (dto.remarks !== undefined) record.remarks = dto.remarks;
      if (dto.status) record.status = dto.status;
      if (dto.is_paid !== undefined) record.is_paid = dto.is_paid;
      record.updated_by = userId;

      const saved = await queryRunner.manager.save(record);

      if (
        oldStatus === LeaveStatus.APPROVED &&
        (saved.status === LeaveStatus.CANCELLED || saved.status === LeaveStatus.REJECTED)
      ) {
        await this.reconcileAttendanceForCancelledLeave(
          queryRunner,
          companyId,
          saved.employee_id,
          oldStartDate,
          oldEndDate,
          saved.id,
          userId,
        );
      } else if (saved.status === LeaveStatus.APPROVED) {
        if (
          oldStatus === LeaveStatus.APPROVED &&
          (oldStartDate !== startDate || oldEndDate !== endDate)
        ) {
          await this.reconcileAttendanceForCancelledLeave(
            queryRunner,
            companyId,
            saved.employee_id,
            oldStartDate,
            oldEndDate,
            saved.id,
            userId,
          );
        }
        await this.syncAttendanceForApprovedLeave(
          queryRunner,
          companyId,
          saved.employee_id,
          saved.start_date,
          saved.end_date,
          saved.id,
          userId,
        );
      }

      const isPaidChanged = dto.is_paid !== undefined && dto.is_paid !== oldIsPaid;
      const action = isPaidChanged
        ? 'LEAVE_RECORD_SALARY_TREATMENT_OVERRIDE'
        : 'LEAVE_RECORD_UPDATE';

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action,
        entityType: 'LEAVE_RECORD',
        entityId: saved.id,
        metadata: {
          status: saved.status,
          employeeName: record.employee ? `${record.employee.first_name || ''} ${record.employee.last_name || ''}`.trim() : undefined,
          employeeCode: record.employee?.employee_code,
          leaveType: record.leave_type?.name,
          startDate: saved.start_date,
          endDate: saved.end_date,
          previousIsPaid: oldIsPaid,
          newIsPaid: saved.is_paid,
        },
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();
      return this.findOne(companyId, id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateLeaveRecordStatusDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const record = await queryRunner.manager.findOne(LeaveRecord, {
        where: { id, company_id: companyId },
        relations: { employee: true, leave_type: true },
      });

      if (!record) {
        throw new NotFoundException('Leave record not found');
      }

      const oldStatus = record.status;

      if (oldStatus === LeaveStatus.APPROVED || dto.status === LeaveStatus.APPROVED) {
        await this.checkPayrollLockForLeave(
          queryRunner,
          companyId,
          record.start_date,
          record.end_date,
        );
      }

      record.status = dto.status;
      record.updated_by = userId;
      const saved = await queryRunner.manager.save(record);

      if (
        oldStatus === LeaveStatus.APPROVED &&
        (saved.status === LeaveStatus.CANCELLED || saved.status === LeaveStatus.REJECTED)
      ) {
        await this.reconcileAttendanceForCancelledLeave(
          queryRunner,
          companyId,
          saved.employee_id,
          saved.start_date,
          saved.end_date,
          saved.id,
          userId,
        );
      } else if (
        saved.status === LeaveStatus.APPROVED &&
        oldStatus !== LeaveStatus.APPROVED
      ) {
        await this.syncAttendanceForApprovedLeave(
          queryRunner,
          companyId,
          saved.employee_id,
          saved.start_date,
          saved.end_date,
          saved.id,
          userId,
        );
      }

      const isCancelled = dto.status === LeaveStatus.CANCELLED;
      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: isCancelled ? 'LEAVE_CANCELLED' : 'LEAVE_RECORD_STATUS_UPDATE',
        entityType: 'LEAVE_RECORD',
        entityId: saved.id,
        metadata: {
          employeeId: record.employee_id,
          employeeName: record.employee ? `${record.employee.first_name || ''} ${record.employee.last_name || ''}`.trim() : undefined,
          employeeCode: record.employee?.employee_code,
          leaveType: record.leave_type?.name,
          startDate: saved.start_date,
          endDate: saved.end_date,
          leaveDate: saved.start_date === saved.end_date ? saved.start_date : `${saved.start_date} to ${saved.end_date}`,
          previousStatus: oldStatus,
          newStatus: saved.status,
          cancellationReason: record.remarks || undefined,
          performedBy: userId,
          timestamp: new Date().toISOString(),
        },
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();
      return this.findOne(companyId, id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
