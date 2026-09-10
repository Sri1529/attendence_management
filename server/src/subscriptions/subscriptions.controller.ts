import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('subscription')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @RequirePermissions(PermissionCode.SUBSCRIPTION_VIEW)
  async getCompanySubscription(@CurrentUser() user: RequestUser) {
    return this.subscriptionsService.getCompanySubscription(user.companyId);
  }

  @Get('plans')
  @RequirePermissions(PermissionCode.SUBSCRIPTION_VIEW)
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('trial')
  @RequirePermissions(PermissionCode.SUBSCRIPTION_MANAGE)
  async startTrial(@CurrentUser() user: RequestUser) {
    return this.subscriptionsService.startTrial(user.companyId, user.userId);
  }

  @Post('cancel')
  @RequirePermissions(PermissionCode.SUBSCRIPTION_MANAGE)
  async cancelSubscription(
    @CurrentUser() user: RequestUser,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService.cancelSubscription(
      user.companyId,
      user.userId,
      dto,
    );
  }
}
