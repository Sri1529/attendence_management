import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveType, LeaveTypeStatus } from './entities/leave-type.entity.js';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto.js';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto.js';
import { UpdateLeaveTypeStatusDto } from './dto/update-leave-type-status.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class LeaveTypesService {
  constructor(
    @InjectRepository(LeaveType)
    private readonly leaveTypeRepository: Repository<LeaveType>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(companyId: string, dto: CreateLeaveTypeDto, userId?: string) {
    const existing = await this.leaveTypeRepository.findOne({
      where: { company_id: companyId, name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(
        'Leave type with this name already exists in your company',
      );
    }

    const leaveType = this.leaveTypeRepository.create({
      company_id: companyId,
      name: dto.name,
      description: dto.description,
      is_paid: dto.is_paid !== undefined ? dto.is_paid : true,
      status: LeaveTypeStatus.ACTIVE,
    });

    const saved = await this.leaveTypeRepository.save(leaveType);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'LEAVE_TYPE_CREATE',
      entityType: 'LEAVE_TYPE',
      entityId: saved.id,
      metadata: { name: saved.name, is_paid: saved.is_paid },
    });

    return saved;
  }

  async findAll(companyId: string, query: PaginationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.leaveTypeRepository
      .createQueryBuilder('lt')
      .where('lt.company_id = :companyId', { companyId });

    if (query.search) {
      qb.andWhere('lt.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('lt.created_at', 'DESC')
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
    const leaveType = await this.leaveTypeRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    return leaveType;
  }

  async update(companyId: string, id: string, dto: UpdateLeaveTypeDto, userId?: string) {
    const leaveType = await this.findOne(companyId, id);
    const oldIsPaid = leaveType.is_paid;

    if (dto.name && dto.name !== leaveType.name) {
      const existing = await this.leaveTypeRepository.findOne({
        where: { company_id: companyId, name: dto.name },
      });
      if (existing) {
        throw new BadRequestException(
          'Leave type with this name already exists in your company',
        );
      }
      leaveType.name = dto.name;
    }

    if (dto.description !== undefined) {
      leaveType.description = dto.description;
    }

    if (dto.is_paid !== undefined) {
      leaveType.is_paid = dto.is_paid;
    }

    const saved = await this.leaveTypeRepository.save(leaveType);

    const isPaidChanged = dto.is_paid !== undefined && dto.is_paid !== oldIsPaid;
    const action = isPaidChanged ? 'LEAVE_TYPE_SALARY_TREATMENT_UPDATE' : 'LEAVE_TYPE_UPDATE';

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action,
      entityType: 'LEAVE_TYPE',
      entityId: saved.id,
      metadata: {
        name: saved.name,
        is_paid: saved.is_paid,
        previousIsPaid: oldIsPaid,
        newIsPaid: saved.is_paid,
      },
    });

    return saved;
  }

  async updateStatus(
    companyId: string,
    id: string,
    dto: UpdateLeaveTypeStatusDto,
    userId?: string,
  ) {
    const leaveType = await this.findOne(companyId, id);
    leaveType.status = dto.status;
    const saved = await this.leaveTypeRepository.save(leaveType);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'LEAVE_TYPE_STATUS_UPDATE',
      entityType: 'LEAVE_TYPE',
      entityId: saved.id,
      metadata: { name: saved.name, status: saved.status },
    });

    return saved;
  }
}
