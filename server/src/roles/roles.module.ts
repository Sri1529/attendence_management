import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity.js';
import { RolePermission } from './entities/role-permission.entity.js';
import { Permission } from '../permissions/entities/permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { RolesService } from './roles.service.js';
import { RolesController } from './roles.controller.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, RolePermission, Permission, User]),
    JwtModule.register({}),
  ],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
