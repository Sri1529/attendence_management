import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Attendance, AttendanceStatus } from './entities/attendance.entity.js';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity.js';
import { LeaveRecord, LeaveStatus } from '../leave-records/entities/leave-record.entity.js';
import { PayrollPeriod, PayrollPeriodStatus } from '../payroll/entities/payroll-period.entity.js';
import { CreateAttendanceDto } from './dto/create-attendance.dto.js';
import { UpdateAttendanceDto } from './dto/update-attendance.dto.js';
import { UpdateAttendanceStatusDto } from './dto/update-attendance-status.dto.js';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto.js';
import { AttendanceQueryDto } from './dto/attendance-query.dto.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(LeaveRecord)
    private readonly leaveRecordRepository: Repository<LeaveRecord>,
    private readonly auditLogsService: AuditLogsService,
    private readonly dataSource: DataSource,
  ) {}

  private async checkPayrollLockForAttendanceDate(
    companyId: string,
    attendanceDate: string,
  ) {
    const lockedPeriod = await this.dataSource
      .getRepository(PayrollPeriod)
      .createQueryBuilder('pp')
      .where('pp.company_id = :companyId', { companyId })
      .andWhere('pp.status IN (:...statuses)', {
        statuses: [PayrollPeriodStatus.FINALIZED, PayrollPeriodStatus.PAID],
      })
      .andWhere(':date BETWEEN pp.start_date AND pp.end_date', {
        date: attendanceDate,
      })
      .getOne();

    if (lockedPeriod) {
      if (lockedPeriod.status === PayrollPeriodStatus.PAID) {
        throw new BadRequestException(
          'Attendance for this date is locked because it belongs to a paid payroll and cannot be modified.',
        );
      }
      if (lockedPeriod.status === PayrollPeriodStatus.FINALIZED) {
        throw new BadRequestException(
          'Attendance for this date is locked because it belongs to a finalized payroll. Reopen the payroll for correction before modifying attendance.',
        );
      }
    }
  }

  private async checkLeaveConsistency(
    companyId: string,
    employeeId: string,
    date: string,
    status: AttendanceStatus,
  ) {
    if (
      status === AttendanceStatus.PRESENT ||
      status === AttendanceStatus.ABSENT ||
      status === AttendanceStatus.HALF_DAY
    ) {
      const approvedLeave = await this.leaveRecordRepository
        .createQueryBuilder('lr')
        .where('lr.company_id = :companyId', { companyId })
        .andWhere('lr.employee_id = :employeeId', { employeeId })
        .andWhere('lr.status = :leaveStatus', { leaveStatus: LeaveStatus.APPROVED })
        .andWhere(':date BETWEEN lr.start_date AND lr.end_date', { date })
        .getOne();

      if (approvedLeave) {
        throw new BadRequestException(
          'Employee has approved leave on this date',
        );
      }
    }
  }

  async create(companyId: string, userId: string, dto: CreateAttendanceDto) {
    await this.checkPayrollLockForAttendanceDate(companyId, dto.attendanceDate);

    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId, company_id: companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.employment_status === EmploymentStatus.TERMINATED) {
      throw new BadRequestException(
        'Cannot record attendance for a terminated employee',
      );
    }

    const existing = await this.attendanceRepository.findOne({
      where: {
        company_id: companyId,
        employee_id: dto.employeeId,
        attendance_date: dto.attendanceDate,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Attendance record already exists for this date',
      );
    }

    await this.checkLeaveConsistency(
      companyId,
      dto.employeeId,
      dto.attendanceDate,
      dto.status,
    );

    const attendance = this.attendanceRepository.create({
      company_id: companyId,
      employee_id: dto.employeeId,
      attendance_date: dto.attendanceDate,
      status: dto.status,
      remarks: dto.remarks,
      created_by: userId,
      updated_by: userId,
    });

    const saved = await this.attendanceRepository.save(attendance);

    await this.auditLogsService.logAction({
      companyId,
      userId,
      action: 'ATTENDANCE_CREATE',
      entityType: 'ATTENDANCE',
      entityId: saved.id,
      metadata: {
        employeeId: saved.employee_id,
        employeeCode: employee.employee_code,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        attendanceDate: saved.attendance_date,
        status: saved.status,
        remarks: saved.remarks,
      },
    });

    return this.findOne(companyId, saved.id);
  }

  async bulk(companyId: string, userId: string, dto: BulkAttendanceDto) {
    await this.checkPayrollLockForAttendanceDate(companyId, dto.attendanceDate);

    const employeeIds = dto.records.map((r) => r.employeeId);
    const uniqueIds = new Set(employeeIds);
    if (uniqueIds.size !== employeeIds.length) {
      throw new BadRequestException('Duplicate employee ID in bulk request');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const recordsSnapshot: Array<{
      employeeId: string;
      employeeName: string;
      employeeCode: string;
      status: string;
      remarks?: string;
      leaveTypeName?: string;
      isLeave?: boolean;
    }> = [];

    try {
      for (const item of dto.records) {
        const employee = await queryRunner.manager.findOne(Employee, {
          where: { id: item.employeeId, company_id: companyId },
        });

        if (!employee) {
          throw new BadRequestException(
            `Employee ${item.employeeId} not found in this company`,
          );
        }

        if (employee.employment_status === EmploymentStatus.TERMINATED) {
          throw new BadRequestException(
            `Cannot record attendance for terminated employee ${item.employeeId}`,
          );
        }

        const matchingLeave = await queryRunner.manager
          .createQueryBuilder(LeaveRecord, 'lr')
          .leftJoinAndSelect('lr.leave_type', 'lt')
          .where('lr.company_id = :companyId', { companyId })
          .andWhere('lr.employee_id = :employeeId', { employeeId: item.employeeId })
          .andWhere('lr.status = :leaveStatus', { leaveStatus: LeaveStatus.APPROVED })
          .andWhere(':date BETWEEN lr.start_date AND lr.end_date', {
            date: dto.attendanceDate,
          })
          .getOne();

        if (
          item.status === AttendanceStatus.PRESENT ||
          item.status === AttendanceStatus.ABSENT ||
          item.status === AttendanceStatus.HALF_DAY
        ) {
          if (matchingLeave) {
            throw new ConflictException(
              `This attendance record is linked to an approved leave. Modify the leave record instead.`,
            );
          }
        }

        recordsSnapshot.push({
          employeeId: employee.id,
          employeeName: `${employee.first_name} ${employee.last_name}`,
          employeeCode: employee.employee_code,
          status: item.status,
          remarks: item.remarks || (matchingLeave ? 'Auto-synchronized from approved leave' : undefined),
          leaveTypeName: matchingLeave?.leave_type?.name,
          isLeave: item.status === AttendanceStatus.LEAVE || !!matchingLeave,
        });

        let existing = await queryRunner.manager.findOne(Attendance, {
          where: {
            company_id: companyId,
            employee_id: item.employeeId,
            attendance_date: dto.attendanceDate,
          },
        });

        if (existing) {
          if (existing.leave_record_id) {
            const lr = await queryRunner.manager.findOne(LeaveRecord, {
              where: { id: existing.leave_record_id, company_id: companyId },
            });
            if (
              lr &&
              lr.status === LeaveStatus.APPROVED &&
              item.status !== AttendanceStatus.LEAVE
            ) {
              throw new ConflictException(
                'This attendance record is linked to an approved leave. Modify the leave record instead.',
              );
            }
          }

          existing.status = item.status;
          if (item.remarks !== undefined) existing.remarks = item.remarks;
          existing.updated_by = userId;
          await queryRunner.manager.save(existing);
        } else {
          existing = queryRunner.manager.create(Attendance, {
            company_id: companyId,
            employee_id: item.employeeId,
            attendance_date: dto.attendanceDate,
            status: item.status,
            remarks: item.remarks,
            created_by: userId,
            updated_by: userId,
          });
          await queryRunner.manager.save(existing);
        }
      }

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action: 'ATTENDANCE_BULK_CREATE',
        entityType: 'ATTENDANCE',
        metadata: {
          attendanceDate: dto.attendanceDate,
          count: dto.records.length,
          records: recordsSnapshot,
        },
        entityManager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();
      return {
        message: 'Bulk attendance recorded successfully',
        count: dto.records.length,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(companyId: string, query: AttendanceQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.attendanceRepository
      .createQueryBuilder('att')
      .leftJoinAndSelect('att.employee', 'employee')
      .leftJoinAndSelect('att.leave_record', 'leave_record')
      .where('att.company_id = :companyId', { companyId });

    if (query.employeeId) {
      const emp = await this.employeeRepository.findOne({
        where: { id: query.employeeId, company_id: companyId },
      });
      if (!emp) {
        throw new NotFoundException('Employee not found');
      }
      qb.andWhere('att.employee_id = :employeeId', {
        employeeId: query.employeeId,
      });
    }

    if (query.startDate) {
      qb.andWhere('att.attendance_date >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      qb.andWhere('att.attendance_date <= :endDate', {
        endDate: query.endDate,
      });
    }

    if (query.status) {
      qb.andWhere('att.status = :status', { status: query.status });
    }

    qb.orderBy('att.attendance_date', 'DESC')
      .addOrderBy('att.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const attendance = await this.attendanceRepository.findOne({
      where: { id, company_id: companyId },
      relations: { employee: true, leave_record: true },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return attendance;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateAttendanceDto,
  ) {
    const attendance = await this.findOne(companyId, id);
    await this.checkPayrollLockForAttendanceDate(companyId, attendance.attendance_date);

    const approvedLeave = await this.leaveRecordRepository
      .createQueryBuilder('lr')
      .where('lr.company_id = :companyId', { companyId })
      .andWhere('lr.employee_id = :employeeId', { employeeId: attendance.employee_id })
      .andWhere('lr.status = :leaveStatus', { leaveStatus: LeaveStatus.APPROVED })
      .andWhere(':date BETWEEN lr.start_date AND lr.end_date', { date: attendance.attendance_date })
      .getOne();

    if (
      attendance.leave_record_id ||
      (attendance.leave_record && attendance.leave_record.status === LeaveStatus.APPROVED) ||
      approvedLeave
    ) {
      if (approvedLeave && !attendance.leave_record_id) {
        attendance.leave_record_id = approvedLeave.id;
        await this.attendanceRepository.save(attendance);
      }
      throw new ConflictException(
        'This attendance record is linked to an approved leave. Modify the leave record instead.',
      );
    }

    if (dto.status && dto.status !== attendance.status) {
      await this.checkLeaveConsistency(
        companyId,
        attendance.employee_id,
        attendance.attendance_date,
        dto.status,
      );
      attendance.status = dto.status;
    }

    if (dto.remarks !== undefined) {
      attendance.remarks = dto.remarks;
    }

    attendance.updated_by = userId;
    await this.attendanceRepository.save(attendance);

    await this.auditLogsService.logAction({
      companyId,
      userId,
      action: 'ATTENDANCE_UPDATE',
      entityType: 'ATTENDANCE',
      entityId: attendance.id,
      metadata: {
        employeeId: attendance.employee_id,
        attendanceDate: attendance.attendance_date,
        status: attendance.status,
        remarks: attendance.remarks,
      },
    });

    return this.findOne(companyId, id);
  }

  async updateStatus(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateAttendanceStatusDto,
  ) {
    return this.update(companyId, userId, id, { status: dto.status });
  }
}
