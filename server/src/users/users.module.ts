import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { Permission } from '../permissions/entities/permission.entity.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, RolePermission, Permission]),
    JwtModule.register({}),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
