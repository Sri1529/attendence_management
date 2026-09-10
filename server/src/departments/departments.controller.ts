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
import { DepartmentsService } from './departments.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { UpdateDepartmentStatusDto } from './dto/update-department-status.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions(PermissionCode.DEPARTMENT_CREATE)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(user.companyId, dto, user.userId);
  }

  @Get()
  @RequirePermissions(PermissionCode.DEPARTMENT_VIEW)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.departmentsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.DEPARTMENT_VIEW)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.departmentsService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.DEPARTMENT_UPDATE)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(user.companyId, id, dto, user.userId);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.DEPARTMENT_UPDATE)
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentStatusDto,
  ) {
    return this.departmentsService.updateStatus(user.companyId, id, dto, user.userId);
  }
}
