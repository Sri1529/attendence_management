import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service.js';
import { AuditLogQueryDto } from './dto/audit-log-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermissions(PermissionCode.AUDIT_LOG_VIEW)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditLogsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.AUDIT_LOG_VIEW)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.auditLogsService.findOne(user.companyId, id);
  }
}
