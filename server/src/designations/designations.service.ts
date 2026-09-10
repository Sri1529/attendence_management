import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Designation, DesignationStatus } from './entities/designation.entity.js';
import { CreateDesignationDto } from './dto/create-designation.dto.js';
import { UpdateDesignationDto } from './dto/update-designation.dto.js';
import { UpdateDesignationStatusDto } from './dto/update-designation-status.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class DesignationsService {
  constructor(
    @InjectRepository(Designation)
    private readonly designationRepository: Repository<Designation>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(companyId: string, dto: CreateDesignationDto, userId?: string) {
    const existing = await this.designationRepository.findOne({
      where: { company_id: companyId, name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(
        'Designation with this name already exists in your company',
      );
    }

    const designation = this.designationRepository.create({
      company_id: companyId,
      name: dto.name,
      description: dto.description,
      status: DesignationStatus.ACTIVE,
    });

    const saved = await this.designationRepository.save(designation);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'DESIGNATION_CREATE',
      entityType: 'DESIGNATION',
      entityId: saved.id,
      metadata: { name: saved.name },
    });

    return saved;
  }

  async findAll(companyId: string, query: PaginationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.designationRepository
      .createQueryBuilder('desg')
      .where('desg.company_id = :companyId', { companyId });

    if (query.search) {
      qb.andWhere('desg.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('desg.created_at', 'DESC')
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
    const designation = await this.designationRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    return designation;
  }

  async update(companyId: string, id: string, dto: UpdateDesignationDto, userId?: string) {
    const designation = await this.findOne(companyId, id);

    if (dto.name && dto.name !== designation.name) {
      const existing = await this.designationRepository.findOne({
        where: { company_id: companyId, name: dto.name },
      });
      if (existing) {
        throw new BadRequestException(
          'Designation with this name already exists in your company',
        );
      }
      designation.name = dto.name;
    }

    if (dto.description !== undefined) {
      designation.description = dto.description;
    }

    const saved = await this.designationRepository.save(designation);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'DESIGNATION_UPDATE',
      entityType: 'DESIGNATION',
      entityId: saved.id,
      metadata: { name: saved.name },
    });

    return saved;
  }

  async updateStatus(
    companyId: string,
    id: string,
    dto: UpdateDesignationStatusDto,
    userId?: string,
  ) {
    const designation = await this.findOne(companyId, id);
    designation.status = dto.status;
    const saved = await this.designationRepository.save(designation);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'DESIGNATION_STATUS_UPDATE',
      entityType: 'DESIGNATION',
      entityId: saved.id,
      metadata: { name: saved.name, status: saved.status },
    });

    return saved;
  }
}
