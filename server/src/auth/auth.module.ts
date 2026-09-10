import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { Permission } from '../permissions/entities/permission.entity.js';
import { Subscription } from '../subscriptions/entities/subscription.entity.js';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity.js';
import { UsersModule } from '../users/users.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RolePermission,
      Company,
      Role,
      Permission,
      Subscription,
      SubscriptionPlan,
    ]),
    JwtModule.register({}),
    UsersModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
