import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions(PermissionCode.ROLE_VIEW)
  async findAll() {
    return this.permissionsService.findAll();
  }
}
