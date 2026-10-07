import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto.js';
import { GeneratePayrollDto } from './dto/generate-payroll.dto.js';
import { PayrollPeriodQueryDto } from './dto/payroll-period-query.dto.js';
import { PayrollRecordQueryDto } from './dto/payroll-record-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

import { CreatePayrollCorrectionDto } from './dto/create-payroll-correction.dto.js';
import { ReversePayrollCorrectionDto } from './dto/reverse-payroll-correction.dto.js';
import { ReopenPayrollPeriodDto } from './dto/reopen-payroll-period.dto.js';
import { PayPayrollRecordDto } from './dto/pay-payroll-record.dto.js';

@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('periods')
  @RequirePermissions(PermissionCode.PAYROLL_GENERATE)
  async createPeriod(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePayrollPeriodDto,
  ) {
    return this.payrollService.createPeriod(user.companyId, user.userId, dto);
  }

  @Get('periods')
  @RequirePermissions(PermissionCode.PAYROLL_VIEW)
  async findAllPeriods(
    @CurrentUser() user: RequestUser,
    @Query() query: PayrollPeriodQueryDto,
  ) {
    return this.payrollService.findAllPeriods(user.companyId, query);
  }

  @Get('periods/:id')
  @RequirePermissions(PermissionCode.PAYROLL_VIEW)
  async findOnePeriod(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.findOnePeriod(user.companyId, id);
  }

  @Post('periods/:id/generate')
  @RequirePermissions(PermissionCode.PAYROLL_GENERATE)
  async generatePayroll(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GeneratePayrollDto,
  ) {
    return this.payrollService.generatePayroll(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }

  @Post('periods/:id/finalize')
  @RequirePermissions(PermissionCode.PAYROLL_FINALIZE)
  async finalizePayroll(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.finalizePayroll(
      user.companyId,
      user.userId,
      id,
    );
  }

  @Post('periods/:id/paid')
  @RequirePermissions(PermissionCode.PAYROLL_MARK_PAID)
  async markPaid(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: PayPayrollRecordDto,
  ) {
    return this.payrollService.markPaid(user.companyId, user.userId, id, dto);
  }

  @Post('records/:id/pay')
  @RequirePermissions(PermissionCode.PAYROLL_MARK_PAID)
  async payRecord(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayPayrollRecordDto,
  ) {
    return this.payrollService.payRecord(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }

  @Post('periods/:id/reopen-for-correction')
  @RequirePermissions(PermissionCode.PAYROLL_REOPEN_FOR_CORRECTION)
  async reopenPeriodForCorrection(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReopenPayrollPeriodDto,
  ) {
    return this.payrollService.reopenPeriodForCorrection(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }

  @Post('periods/:id/cancel')
  @RequirePermissions(PermissionCode.PAYROLL_GENERATE)
  async cancelPeriod(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.cancelPeriod(user.companyId, user.userId, id);
  }

  @Get('periods/:periodId/records')
  @RequirePermissions(PermissionCode.PAYROLL_VIEW)
  async findAllRecords(
    @CurrentUser() user: RequestUser,
    @Param('periodId', ParseUUIDPipe) periodId: string,
    @Query() query: PayrollRecordQueryDto,
  ) {
    return this.payrollService.findAllRecords(
      user.companyId,
      periodId,
      query,
    );
  }

  @Get('records/:id')
  @RequirePermissions(PermissionCode.PAYROLL_VIEW)
  async findOneRecord(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.findOneRecord(user.companyId, id);
  }

  @Get('records/:id/corrections')
  @RequirePermissions(PermissionCode.PAYROLL_CORRECTION_VIEW)
  async getRecordCorrections(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.getRecordCorrectionsBreakdown(user.companyId, id);
  }

  @Post('records/:id/corrections')
  @RequirePermissions(
    PermissionCode.PAYROLL_CORRECTION_CREATE,
    PermissionCode.PAYROLL_CORRECTION_APPLY,
  )
  async createCorrection(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePayrollCorrectionDto,
  ) {
    return this.payrollService.createAndApplyCorrection(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }

  @Post('corrections/:id/reverse')
  @RequirePermissions(PermissionCode.PAYROLL_CORRECTION_REVERSE)
  async reverseCorrection(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReversePayrollCorrectionDto,
  ) {
    return this.payrollService.reverseCorrection(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }
}
