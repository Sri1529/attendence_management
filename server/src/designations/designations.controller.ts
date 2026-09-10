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
import { DesignationsService } from './designations.service.js';
import { CreateDesignationDto } from './dto/create-designation.dto.js';
import { UpdateDesignationDto } from './dto/update-designation.dto.js';
import { UpdateDesignationStatusDto } from './dto/update-designation-status.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('designations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Post()
  @RequirePermissions(PermissionCode.DESIGNATION_CREATE)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateDesignationDto,
  ) {
    return this.designationsService.create(user.companyId, dto, user.userId);
  }

  @Get()
  @RequirePermissions(PermissionCode.DESIGNATION_VIEW)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.designationsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.DESIGNATION_VIEW)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.designationsService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.DESIGNATION_UPDATE)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignationDto,
  ) {
    return this.designationsService.update(user.companyId, id, dto, user.userId);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.DESIGNATION_UPDATE)
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignationStatusDto,
  ) {
    return this.designationsService.updateStatus(user.companyId, id, dto, user.userId);
  }
}
