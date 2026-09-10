import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Designation } from './entities/designation.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { DesignationsService } from './designations.service.js';
import { DesignationsController } from './designations.controller.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Designation, Role, RolePermission, User]),
    JwtModule.register({}),
  ],
  providers: [DesignationsService],
  controllers: [DesignationsController],
  exports: [DesignationsService],
})
export class DesignationsModule {}
