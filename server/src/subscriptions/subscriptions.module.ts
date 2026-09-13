import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity.js';
import { SubscriptionPlan } from './entities/subscription-plan.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionGuard } from '../common/guards/subscription.guard.js';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      SubscriptionPlan,
      Role,
      RolePermission,
      User,
      Employee,
    ]),
    JwtModule.register({}),
  ],
  providers: [SubscriptionsService, SubscriptionGuard],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, SubscriptionGuard],
})
export class SubscriptionsModule {}
