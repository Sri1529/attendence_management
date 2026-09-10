import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SalaryService } from './salary.service.js';
import { CreateSalaryDto } from './dto/create-salary.dto.js';
import { UpdateSalaryDto } from './dto/update-salary.dto.js';
import { CorrectSalaryDto } from './dto/correct-salary.dto.js';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto.js';
import { UpdateAdjustmentStatusDto } from './dto/update-adjustment-status.dto.js';
import { SalaryQueryDto } from './dto/salary-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Get('employees/:employeeId/salary/current')
  @RequirePermissions(PermissionCode.SALARY_VIEW)
  async getCurrentSalary(
    @CurrentUser() user: RequestUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: SalaryQueryDto,
  ) {
    return this.salaryService.getCurrentSalary(
      user.companyId,
      employeeId,
      query.date,
    );
  }

  @Get('employees/:employeeId/salary/history')
  @RequirePermissions(PermissionCode.SALARY_VIEW)
  async getSalaryHistory(
    @CurrentUser() user: RequestUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.salaryService.getSalaryHistory(user.companyId, employeeId);
  }

  @Post('employees/:employeeId/salary')
  @RequirePermissions(PermissionCode.SALARY_CREATE)
  async createSalary(
    @CurrentUser() user: RequestUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateSalaryDto,
  ) {
    return this.salaryService.createSalary(
      user.companyId,
      user.userId,
      employeeId,
      dto,
    );
  }

  @Patch('salary-history/:id/correct')
  @RequirePermissions(PermissionCode.SALARY_UPDATE)
  async correctSalaryHistory(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CorrectSalaryDto,
  ) {
    return this.salaryService.correctSalaryHistory(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }

  @Patch('salary-history/:id')
  @RequirePermissions(PermissionCode.SALARY_UPDATE)
  async updateSalaryHistoryNotes(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalaryDto,
  ) {
    return this.salaryService.updateSalaryHistoryNotes(
      user.companyId,
      id,
      dto,
    );
  }

  @Get('employees/:employeeId/salary-adjustments')
  @RequirePermissions(PermissionCode.SALARY_VIEW)
  async getAdjustments(
    @CurrentUser() user: RequestUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.salaryService.getAdjustments(user.companyId, employeeId);
  }

  @Post('employees/:employeeId/salary-adjustments')
  @RequirePermissions(PermissionCode.SALARY_CREATE)
  async createAdjustment(
    @CurrentUser() user: RequestUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateAdjustmentDto,
  ) {
    return this.salaryService.createAdjustment(
      user.companyId,
      user.userId,
      employeeId,
      dto,
    );
  }

  @Patch('salary-adjustments/:id/status')
  @RequirePermissions(PermissionCode.SALARY_UPDATE)
  async updateAdjustmentStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdjustmentStatusDto,
  ) {
    return this.salaryService.updateAdjustmentStatus(
      user.companyId,
      id,
      dto,
    );
  }
}
