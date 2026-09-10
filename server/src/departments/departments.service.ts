import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department, DepartmentStatus } from './entities/department.entity.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { UpdateDepartmentStatusDto } from './dto/update-department-status.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(companyId: string, dto: CreateDepartmentDto, userId?: string) {
    const existing = await this.departmentRepository.findOne({
      where: { company_id: companyId, name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(
        'Department with this name already exists in your company',
      );
    }

    const department = this.departmentRepository.create({
      company_id: companyId,
      name: dto.name,
      description: dto.description,
      status: DepartmentStatus.ACTIVE,
    });

    const saved = await this.departmentRepository.save(department);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'DEPARTMENT_CREATE',
      entityType: 'DEPARTMENT',
      entityId: saved.id,
      metadata: { name: saved.name },
    });

    return saved;
  }

  async findAll(companyId: string, query: PaginationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.departmentRepository
      .createQueryBuilder('dept')
      .where('dept.company_id = :companyId', { companyId });

    if (query.search) {
      qb.andWhere('dept.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('dept.created_at', 'DESC')
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
    const department = await this.departmentRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(companyId: string, id: string, dto: UpdateDepartmentDto, userId?: string) {
    const department = await this.findOne(companyId, id);

    if (dto.name && dto.name !== department.name) {
      const existing = await this.departmentRepository.findOne({
        where: { company_id: companyId, name: dto.name },
      });
      if (existing) {
        throw new BadRequestException(
          'Department with this name already exists in your company',
        );
      }
      department.name = dto.name;
    }

    if (dto.description !== undefined) {
      department.description = dto.description;
    }

    const saved = await this.departmentRepository.save(department);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'DEPARTMENT_UPDATE',
      entityType: 'DEPARTMENT',
      entityId: saved.id,
      metadata: { name: saved.name },
    });

    return saved;
  }

  async updateStatus(
    companyId: string,
    id: string,
    dto: UpdateDepartmentStatusDto,
    userId?: string,
  ) {
    const department = await this.findOne(companyId, id);
    department.status = dto.status;
    const saved = await this.departmentRepository.save(department);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'DEPARTMENT_STATUS_UPDATE',
      entityType: 'DEPARTMENT',
      entityId: saved.id,
      metadata: { name: saved.name, status: saved.status },
    });

    return saved;
  }
}
