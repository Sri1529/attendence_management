import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeSalaryHistory } from './entities/employee-salary-history.entity.js';
import { SalaryAdjustment } from './entities/salary-adjustment.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { SalaryService } from './salary.service.js';
import { SalaryController } from './salary.controller.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployeeSalaryHistory,
      SalaryAdjustment,
      Employee,
      Role,
      RolePermission,
      User,
    ]),
    JwtModule.register({}),
  ],
  providers: [SalaryService],
  controllers: [SalaryController],
  exports: [SalaryService],
})
export class SalaryModule {}
