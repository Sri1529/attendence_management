import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getCompany(companyId: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Company profile not found.');
    }
    return company;
  }

  async updateCompany(
    companyId: string,
    dto: UpdateCompanyDto,
    userId?: string,
  ): Promise<Company> {
    const company = await this.getCompany(companyId);
    const oldMode = company.absence_deduction_mode;
    Object.assign(company, dto);
    const updated = await this.companyRepository.save(company);

    if (userId) {
      const action = dto.absence_deduction_mode !== undefined
        ? 'ABSENCE_DEDUCTION_MODE_UPDATE'
        : 'COMPANY_SETTINGS_UPDATED';

      await this.auditLogsService.logAction({
        companyId,
        userId,
        action,
        entityType: 'Company',
        entityId: companyId,
        metadata: {
          ...dto,
          previousMode: oldMode,
          newMode: updated.absence_deduction_mode,
        },
      });
    }

    return updated;
  }
}
