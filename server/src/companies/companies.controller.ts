import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('companies')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('my-company')
  @RequirePermissions(PermissionCode.COMPANY_SETTINGS_VIEW)
  async getMyCompany(@CurrentUser() user: RequestUser) {
    return this.companiesService.getCompany(user.companyId);
  }

  @Patch('my-company')
  @RequirePermissions(PermissionCode.COMPANY_SETTINGS_UPDATE)
  async updateMyCompany(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateCompany(user.companyId, dto, user.userId);
  }
}
