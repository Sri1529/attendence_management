import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { PaymentQueryDto } from './dto/payment-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../common/guards/permission.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionCode } from '../common/enums/permission-code.enum.js';
import { RequestUser } from '../common/interfaces/jwt-payload.interface.js';

@Controller('subscription')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payment/order')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(PermissionCode.SUBSCRIPTION_MANAGE)
  async createOrder(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePaymentOrderDto,
  ) {
    return this.paymentsService.createOrder(user.companyId, user.userId, dto);
  }

  @Post('payment/verify')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(PermissionCode.SUBSCRIPTION_MANAGE)
  async verifyPayment(
    @CurrentUser() user: RequestUser,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(user.companyId, user.userId, dto);
  }

  @Post('payment/webhook')
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing x-razorpay-signature header');
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    return this.paymentsService.processWebhook(rawBody, signature);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(PermissionCode.SUBSCRIPTION_VIEW)
  async findAllPayments(
    @CurrentUser() user: RequestUser,
    @Query() query: PaymentQueryDto,
  ) {
    return this.paymentsService.findAllPayments(user.companyId, query);
  }

  @Get('payments/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(PermissionCode.SUBSCRIPTION_VIEW)
  async findOnePayment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.paymentsService.findOnePayment(user.companyId, id);
  }
}
