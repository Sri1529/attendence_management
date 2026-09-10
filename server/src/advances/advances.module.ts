import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeAdvance } from './entities/employee-advance.entity.js';
import { AdvanceRepayment } from './entities/advance-repayment.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AdvancesService } from './advances.service.js';
import { AdvancesController } from './advances.controller.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployeeAdvance,
      AdvanceRepayment,
      Employee,
      Role,
      RolePermission,
      User,
    ]),
    JwtModule.register({}),
  ],
  providers: [AdvancesService],
  controllers: [AdvancesController],
  exports: [AdvancesService],
})
export class AdvancesModule {}
