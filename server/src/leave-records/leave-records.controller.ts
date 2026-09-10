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
import { LeaveRecordsService } from './leave-records.service.js';
import { CreateLeaveRecordDto } from './dto/create-leave-record.dto.js';
import { UpdateLeaveRecordDto } from './dto/update-leave-record.dto.js';
import { UpdateLeaveRecordStatusDto } from './dto/update-leave-record-status.dto.js';
import { LeaveRecordQueryDto } from './dto/leave-record-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('leave-records')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LeaveRecordsController {
  constructor(private readonly leaveRecordsService: LeaveRecordsService) {}

  @Post()
  @RequirePermissions(PermissionCode.LEAVE_CREATE)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateLeaveRecordDto,
  ) {
    return this.leaveRecordsService.create(user.companyId, user.userId, dto);
  }

  @Get()
  @RequirePermissions(PermissionCode.LEAVE_VIEW)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: LeaveRecordQueryDto,
  ) {
    return this.leaveRecordsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.LEAVE_VIEW)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveRecordsService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.LEAVE_UPDATE)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveRecordDto,
  ) {
    return this.leaveRecordsService.update(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.LEAVE_UPDATE)
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveRecordStatusDto,
  ) {
    return this.leaveRecordsService.updateStatus(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }
}
