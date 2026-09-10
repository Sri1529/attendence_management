import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './entities/attendance.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { LeaveRecord } from '../leave-records/entities/leave-record.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { JwtModule } from '@nestjs/jwt';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance,
      Employee,
      LeaveRecord,
      Role,
      RolePermission,
      User,
    ]),
    JwtModule.register({}),
    AuditLogsModule,
  ],
  providers: [AttendanceService],
  controllers: [AttendanceController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
