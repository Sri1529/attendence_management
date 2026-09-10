import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollPeriod } from './entities/payroll-period.entity.js';
import { PayrollRecord } from './entities/payroll-record.entity.js';
import { PayrollCorrection } from './entities/payroll-correction.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { EmployeeSalaryHistory } from '../salary/entities/employee-salary-history.entity.js';
import { Attendance } from '../attendance/entities/attendance.entity.js';
import { SalaryAdjustment } from '../salary/entities/salary-adjustment.entity.js';
import { EmployeeAdvance } from '../advances/entities/employee-advance.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { PayrollService } from './payroll.service.js';
import { PayrollController } from './payroll.controller.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayrollPeriod,
      PayrollRecord,
      PayrollCorrection,
      Employee,
      EmployeeSalaryHistory,
      Attendance,
      SalaryAdjustment,
      EmployeeAdvance,
      Role,
      RolePermission,
      User,
    ]),
    JwtModule.register({}),
  ],
  providers: [PayrollService],
  controllers: [PayrollController],
  exports: [PayrollService],
})
export class PayrollModule {}
