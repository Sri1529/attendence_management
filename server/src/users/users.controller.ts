import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(PermissionCode.USER_CREATE)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(user.companyId, dto, user.userId);
  }

  @Get()
  @RequirePermissions(PermissionCode.USER_VIEW)
  async findAll(@CurrentUser() user: RequestUser) {
    return this.usersService.findAll(user.companyId);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.USER_VIEW)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.USER_UPDATE)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user.companyId, id, dto, user.userId);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.USER_DEACTIVATE)
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(user.companyId, id, dto, user.userId);
  }
}
