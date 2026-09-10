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
import { AdvancesService } from './advances.service.js';
import { CreateAdvanceDto } from './dto/create-advance.dto.js';
import { UpdateAdvanceStatusDto } from './dto/update-advance-status.dto.js';
import { AdvanceQueryDto } from './dto/advance-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdvancesController {
  constructor(private readonly advancesService: AdvancesService) {}

  @Get('employees/:employeeId/advances')
  @RequirePermissions(PermissionCode.ADVANCE_VIEW)
  async getAdvances(
    @CurrentUser() user: RequestUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: AdvanceQueryDto,
  ) {
    return this.advancesService.getAdvances(
      user.companyId,
      employeeId,
      query,
    );
  }

  @Get('advances/:id')
  @RequirePermissions(PermissionCode.ADVANCE_VIEW)
  async getAdvanceById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.advancesService.getAdvanceById(user.companyId, id);
  }

  @Post('employees/:employeeId/advances')
  @RequirePermissions(PermissionCode.ADVANCE_CREATE)
  async createAdvance(
    @CurrentUser() user: RequestUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateAdvanceDto,
  ) {
    return this.advancesService.createAdvance(
      user.companyId,
      user.userId,
      employeeId,
      dto,
    );
  }

  @Patch('advances/:id/status')
  @RequirePermissions(PermissionCode.ADVANCE_UPDATE)
  async updateAdvanceStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdvanceStatusDto,
  ) {
    return this.advancesService.updateAdvanceStatus(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }
}
