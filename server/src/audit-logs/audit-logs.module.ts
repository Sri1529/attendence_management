import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuditLog } from './entities/audit-log.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AuditLogsService } from './audit-logs.service.js';
import { AuditLogsController } from './audit-logs.controller.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, Role, RolePermission, User]),
    JwtModule.register({}),
  ],
  providers: [AuditLogsService],
  controllers: [AuditLogsController],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
