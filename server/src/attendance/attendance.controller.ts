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
import { AttendanceService } from './attendance.service.js';
import { CreateAttendanceDto } from './dto/create-attendance.dto.js';
import { UpdateAttendanceDto } from './dto/update-attendance.dto.js';
import { UpdateAttendanceStatusDto } from './dto/update-attendance-status.dto.js';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto.js';
import { AttendanceQueryDto } from './dto/attendance-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @RequirePermissions(PermissionCode.ATTENDANCE_CREATE)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAttendanceDto,
  ) {
    return this.attendanceService.create(user.companyId, user.userId, dto);
  }

  @Post('bulk')
  @RequirePermissions(PermissionCode.ATTENDANCE_CREATE)
  async bulk(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkAttendanceDto,
  ) {
    return this.attendanceService.bulk(user.companyId, user.userId, dto);
  }

  @Get()
  @RequirePermissions(PermissionCode.ATTENDANCE_VIEW)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendanceService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.ATTENDANCE_VIEW)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attendanceService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.ATTENDANCE_UPDATE)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.ATTENDANCE_UPDATE)
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceStatusDto,
  ) {
    return this.attendanceService.updateStatus(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }
}
