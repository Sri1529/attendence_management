import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeLoan } from './entities/employee-loan.entity.js';
import { LoanRepayment } from './entities/loan-repayment.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { LoansService } from './loans.service.js';
import { LoansController } from './loans.controller.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployeeLoan,
      LoanRepayment,
      Employee,
      Role,
      RolePermission,
      User,
    ]),
    AuditLogsModule,
    JwtModule.register({}),
  ],
  providers: [LoansService],
  controllers: [LoansController],
  exports: [LoansService],
})
export class LoansModule {}
