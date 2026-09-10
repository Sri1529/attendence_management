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
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto.js';
import { EmployeeQueryDto } from './dto/employee-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions(PermissionCode.EMPLOYEE_CREATE)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(user.companyId, dto, user.userId);
  }

  @Get()
  @RequirePermissions(PermissionCode.EMPLOYEE_VIEW)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: EmployeeQueryDto,
  ) {
    return this.employeesService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.EMPLOYEE_VIEW)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.EMPLOYEE_UPDATE)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(user.companyId, id, dto, user.userId);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.EMPLOYEE_UPDATE)
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.employeesService.updateStatus(user.companyId, id, dto, user.userId);
  }
}
