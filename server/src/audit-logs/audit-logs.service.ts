import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditLogQueryDto } from './dto/audit-log-query.dto.js';

export interface LogActionParams {
  companyId: string;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  entityManager?: EntityManager;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  private sanitizeMetadata(
    metadata?: Record<string, any> | null,
  ): Record<string, any> | null {
    if (!metadata) return null;
    const clean = { ...metadata };
    const sensitiveKeys = [
      'password',
      'password_hash',
      'refreshToken',
      'accessToken',
      'token',
      'secret',
    ];

    for (const key of Object.keys(clean)) {
      if (sensitiveKeys.includes(key)) {
        delete clean[key];
      } else if (typeof clean[key] === 'object' && clean[key] !== null) {
        clean[key] = this.sanitizeMetadata(clean[key]);
      }
    }
    return clean;
  }

  async logAction(params: LogActionParams): Promise<AuditLog> {
    const cleanMeta = this.sanitizeMetadata(params.metadata);
    const repo = params.entityManager
      ? params.entityManager.getRepository(AuditLog)
      : this.auditLogRepository;

    const log = repo.create({
      company_id: params.companyId,
      user_id: params.userId || null,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      metadata: cleanMeta,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    });

    return repo.save(log);
  }

  async findAll(companyId: string, query: AuditLogQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.company_id = :companyId', { companyId });

    if (query.userId) {
      qb.andWhere('log.user_id = :userId', { userId: query.userId });
    }

    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }

    if (query.entityType) {
      qb.andWhere('log.entity_type = :entityType', {
        entityType: query.entityType,
      });
    }

    if (query.entityId) {
      qb.andWhere('log.entity_id = :entityId', { entityId: query.entityId });
    }

    if (query.startDate) {
      qb.andWhere('log.created_at >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      qb.andWhere('log.created_at <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('log.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async findOne(companyId: string, id: string) {
    const log = await this.auditLogRepository.findOne({
      where: { id, company_id: companyId },
      relations: { user: true },
    });

    if (!log) {
      throw new NotFoundException('Audit log entry not found');
    }

    return log;
  }
}
