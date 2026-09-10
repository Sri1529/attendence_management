import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payslip } from './entities/payslip.entity.js';
import { PayrollRecord } from '../payroll/entities/payroll-record.entity.js';
import { PayrollCorrection } from '../payroll/entities/payroll-correction.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { PayslipsService } from './payslips.service.js';
import { PayslipsController } from './payslips.controller.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payslip,
      PayrollRecord,
      PayrollCorrection,
      Employee,
      Role,
      RolePermission,
      User,
    ]),
    JwtModule.register({}),
  ],
  providers: [PayslipsService],
  controllers: [PayslipsController],
  exports: [PayslipsService],
})
export class PayslipsModule {}
