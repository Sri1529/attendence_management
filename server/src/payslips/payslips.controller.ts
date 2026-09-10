import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PayslipsService } from './payslips.service.js';
import { PayslipQueryDto } from './dto/payslip-query.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PayslipsController {
  constructor(private readonly payslipsService: PayslipsService) {}

  @Post('payroll/records/:payrollRecordId/payslip')
  @RequirePermissions(PermissionCode.PAYSLIP_CREATE)
  async createPayslip(
    @CurrentUser() user: RequestUser,
    @Param('payrollRecordId', ParseUUIDPipe) payrollRecordId: string,
  ) {
    return this.payslipsService.createPayslip(
      user.companyId,
      user.userId,
      payrollRecordId,
    );
  }

  @Get('payroll/records/:payrollRecordId/payslip')
  @RequirePermissions(PermissionCode.PAYSLIP_VIEW)
  async findByPayrollRecordId(
    @CurrentUser() user: RequestUser,
    @Param('payrollRecordId', ParseUUIDPipe) payrollRecordId: string,
  ) {
    return this.payslipsService.findByPayrollRecordId(
      user.companyId,
      payrollRecordId,
    );
  }

  @Get('payslips/:id')
  @RequirePermissions(PermissionCode.PAYSLIP_VIEW)
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payslipsService.findById(user.companyId, id);
  }

  @Get('payslips/:id/pdf')
  @RequirePermissions(PermissionCode.PAYSLIP_DOWNLOAD)
  async downloadPdf(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.payslipsService.generatePdfBuffer(
      user.companyId,
      id,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(buffer);
  }

  @Get('employees/:employeeId/payslips')
  @RequirePermissions(PermissionCode.PAYSLIP_VIEW)
  async findByEmployeeId(
    @CurrentUser() user: RequestUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: PayslipQueryDto,
  ) {
    return this.payslipsService.findByEmployeeId(
      user.companyId,
      employeeId,
      query,
    );
  }

  @Get('employees/:employeeId/payroll-history')
  @RequirePermissions(PermissionCode.PAYROLL_VIEW)
  async findPayrollHistoryByEmployeeId(
    @CurrentUser() user: RequestUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.payslipsService.findPayrollHistoryByEmployeeId(
      user.companyId,
      employeeId,
      query,
    );
  }
}
