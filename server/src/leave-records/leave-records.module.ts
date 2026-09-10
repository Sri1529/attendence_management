import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRecord } from './entities/leave-record.entity.js';
import { LeaveType } from '../leave-types/entities/leave-type.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { Attendance } from '../attendance/entities/attendance.entity.js';
import { User } from '../users/entities/user.entity.js';
import { LeaveRecordsService } from './leave-records.service.js';
import { LeaveRecordsController } from './leave-records.controller.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveRecord,
      LeaveType,
      Employee,
      Attendance,
      Role,
      RolePermission,
      User,
    ]),
    JwtModule.register({}),
  ],
  providers: [LeaveRecordsService],
  controllers: [LeaveRecordsController],
  exports: [LeaveRecordsService],
})
export class LeaveRecordsModule {}
