import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveType } from './entities/leave-type.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { LeaveTypesService } from './leave-types.service.js';
import { LeaveTypesController } from './leave-types.controller.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaveType, Role, RolePermission, User]),
    JwtModule.register({}),
  ],
  providers: [LeaveTypesService],
  controllers: [LeaveTypesController],
  exports: [LeaveTypesService],
})
export class LeaveTypesModule {}
