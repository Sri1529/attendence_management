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
import { LoansService } from './loans.service.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { LoanQueryDto } from './dto/loan-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get('loans')
  @RequirePermissions(PermissionCode.LOAN_VIEW)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: LoanQueryDto,
  ) {
    return this.loansService.findAll(user.companyId, query);
  }

  @Get('loans/:id')
  @RequirePermissions(PermissionCode.LOAN_VIEW)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.loansService.findOne(user.companyId, id);
  }

  @Post('loans')
  @RequirePermissions(PermissionCode.LOAN_CREATE)
  async createLoan(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateLoanDto,
  ) {
    return this.loansService.createLoan(user.companyId, user.userId, dto);
  }

  @Post('loans/:id/cancel')
  @RequirePermissions(PermissionCode.LOAN_CANCEL)
  async cancelLoan(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes?: string,
  ) {
    return this.loansService.cancelLoan(user.companyId, user.userId, id, notes);
  }

  @Get('loans/:id/repayments')
  @RequirePermissions(PermissionCode.LOAN_REPAYMENT_VIEW)
  async getRepayments(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.loansService.getRepayments(user.companyId, id);
  }

  @Get('employees/:employeeId/loans')
  @RequirePermissions(PermissionCode.LOAN_VIEW)
  async findEmployeeLoans(
    @CurrentUser() user: RequestUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.loansService.findEmployeeLoans(user.companyId, employeeId);
  }
}
