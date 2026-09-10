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
import { LeaveTypesService } from './leave-types.service.js';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto.js';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto.js';
import { UpdateLeaveTypeStatusDto } from './dto/update-leave-type-status.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('leave-types')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LeaveTypesController {
  constructor(private readonly leaveTypesService: LeaveTypesService) {}

  @Post()
  @RequirePermissions(PermissionCode.LEAVE_CREATE)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateLeaveTypeDto,
  ) {
    return this.leaveTypesService.create(user.companyId, dto, user.userId);
  }

  @Get()
  @RequirePermissions(PermissionCode.LEAVE_VIEW)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.leaveTypesService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.LEAVE_VIEW)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveTypesService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.LEAVE_UPDATE)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveTypeDto,
  ) {
    return this.leaveTypesService.update(user.companyId, id, dto, user.userId);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.LEAVE_UPDATE)
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveTypeStatusDto,
  ) {
    return this.leaveTypesService.updateStatus(user.companyId, id, dto, user.userId);
  }
}
