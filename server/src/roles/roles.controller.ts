import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UpdateRoleStatusDto } from './dto/update-role-status.dto.js';
import { AssignPermissionsDto } from './dto/assign-permissions.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions(PermissionCode.ROLE_CREATE)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateRoleDto,
  ) {
    return this.rolesService.create(user.companyId, dto, user.userId);
  }

  @Get()
  @RequirePermissions(PermissionCode.ROLE_VIEW)
  async findAll(@CurrentUser() user: RequestUser) {
    return this.rolesService.findAll(user.companyId);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.ROLE_VIEW)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rolesService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.ROLE_UPDATE)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(user.companyId, id, dto, user.userId);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.ROLE_UPDATE)
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleStatusDto,
  ) {
    return this.rolesService.updateStatus(user.companyId, id, dto, user.userId);
  }

  @Patch(':id/permissions')
  @RequirePermissions(PermissionCode.ROLE_UPDATE)
  async assignPermissions(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(user.companyId, id, dto, user.userId);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.ROLE_DELETE)
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rolesService.remove(user.companyId, id, user.userId);
  }
}
