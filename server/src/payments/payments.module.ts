import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from './entities/payment-transaction.entity.js';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity.js';
import { Subscription } from '../subscriptions/entities/subscription.entity.js';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { User } from '../users/entities/user.entity.js';
import { RazorpayService } from './razorpay.service.js';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentTransaction,
      PaymentWebhookEvent,
      Subscription,
      SubscriptionPlan,
      Role,
      RolePermission,
      User,
    ]),
    JwtModule.register({}),
  ],
  providers: [RazorpayService, PaymentsService],
  controllers: [PaymentsController],
  exports: [RazorpayService, PaymentsService],
})
export class PaymentsModule {}
