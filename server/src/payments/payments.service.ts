import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PaymentTransaction,
  PaymentTransactionStatus,
  BillingInterval,
} from './entities/payment-transaction.entity.js';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity.js';
import {
  Subscription,
  SubscriptionStatus,
} from '../subscriptions/entities/subscription.entity.js';
import {
  SubscriptionPlan,
  PlanStatus,
} from '../subscriptions/entities/subscription-plan.entity.js';
import { RazorpayService } from './razorpay.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { PaymentQueryDto } from './dto/payment-query.dto.js';

import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(PaymentWebhookEvent)
    private readonly webhookEventRepository: Repository<PaymentWebhookEvent>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    private readonly razorpayService: RazorpayService,
    private readonly auditLogsService: AuditLogsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly dataSource: DataSource,
  ) {}

  async createOrder(
    companyId: string,
    userId: string,
    dto: CreatePaymentOrderDto,
  ) {
    const plan = await this.planRepository.findOne({
      where: { code: dto.planCode, status: PlanStatus.ACTIVE },
    });

    if (!plan) {
      throw new NotFoundException(
        `Active plan with code '${dto.planCode}' not found`,
      );
    }

    await this.subscriptionsService.validatePlanDowngrade(companyId, plan);

    let priceStr = plan.price && parseFloat(plan.price) > 0 ? plan.price : plan.price_monthly;
    if (dto.billingInterval === BillingInterval.YEARLY && (!plan.price || parseFloat(plan.price) === 0)) {
      priceStr = plan.price_yearly;
    }

    const priceNum = parseFloat(priceStr);
    if (isNaN(priceNum) || priceNum <= 0) {
      throw new BadRequestException('Invalid plan price for payment order');
    }

    const subUnitAmount = Math.round(priceNum * 100);
    const receipt = `rcpt_${companyId.substring(0, 8)}_${Date.now()}`;

    const razorpayOrder = await this.razorpayService.createOrder({
      amount: subUnitAmount,
      currency: 'INR',
      receipt,
    });

    const transaction = this.transactionRepository.create({
      company_id: companyId,
      plan_id: plan.id,
      user_id: userId,
      razorpay_order_id: razorpayOrder.id,
      amount: priceStr,
      currency: 'INR',
      billing_interval: dto.billingInterval,
      status: PaymentTransactionStatus.CREATED,
    });

    const savedTx = await this.transactionRepository.save(transaction);

    await this.auditLogsService.logAction({
      companyId,
      userId,
      action: 'PAYMENT_ORDER_CREATED',
      entityType: 'PAYMENT_TRANSACTION',
      entityId: savedTx.id,
      metadata: {
        orderId: razorpayOrder.id,
        planCode: plan.code,
        billingInterval: dto.billingInterval,
        amount: priceStr,
      },
    });

    return {
      orderId: razorpayOrder.id,
      amount: subUnitAmount,
      displayAmount: priceStr,
      currency: 'INR',
      keyId: this.razorpayService.getKeyId(),
    };
  }

  async verifyPayment(
    companyId: string,
    userId: string,
    dto: VerifyPaymentDto,
  ) {
    const existingPayment = await this.transactionRepository.findOne({
      where: { razorpay_payment_id: dto.razorpay_payment_id },
      relations: { plan: true },
    });

    if (existingPayment && existingPayment.status === PaymentTransactionStatus.CAPTURED) {
      if (existingPayment.company_id !== companyId) {
        throw new ForbiddenException('Payment belongs to another company');
      }
      return {
        success: true,
        transactionId: existingPayment.id,
        status: existingPayment.status,
        message: 'Payment already verified and captured',
      };
    }

    const transaction = await this.transactionRepository.findOne({
      where: { razorpay_order_id: dto.razorpay_order_id },
      relations: { plan: true },
    });

    if (!transaction) {
      throw new NotFoundException('Payment order not found');
    }

    if (transaction.company_id !== companyId) {
      throw new ForbiddenException('Payment order belongs to another company');
    }

    const isValidSignature = this.razorpayService.verifyPaymentSignature({
      orderId: dto.razorpay_order_id,
      paymentId: dto.razorpay_payment_id,
      signature: dto.razorpay_signature,
    });

    if (!isValidSignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    const paymentDetails = await this.razorpayService.fetchPayment(
      dto.razorpay_payment_id,
    );

    if (
      !paymentDetails ||
      (paymentDetails.status !== 'captured' && !paymentDetails.captured)
    ) {
      throw new BadRequestException(
        'Payment status is not captured on Razorpay',
      );
    }

    const expectedSubUnit = Math.round(parseFloat(transaction.amount) * 100);
    if (paymentDetails.amount && paymentDetails.amount !== expectedSubUnit) {
      throw new BadRequestException('Payment amount mismatch');
    }

    if (paymentDetails.currency && paymentDetails.currency !== transaction.currency) {
      throw new BadRequestException('Payment currency mismatch');
    }

    return this.executePaymentCaptureAndSubscription(
      transaction,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
      paymentDetails.method || 'card',
      userId,
    );
  }

  private async executePaymentCaptureAndSubscription(
    transaction: PaymentTransaction,
    paymentId: string,
    signature: string | null,
    method: string,
    userId?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      transaction.status = PaymentTransactionStatus.CAPTURED;
      transaction.razorpay_payment_id = paymentId;
      transaction.razorpay_signature = signature;
      transaction.payment_method = method;
      transaction.paid_at = now;

      let subscription = await manager.findOne(Subscription, {
        where: { company_id: transaction.company_id },
        relations: { plan: true },
        order: { created_at: 'DESC' },
      });

      const isRenewal =
        subscription &&
        subscription.status === SubscriptionStatus.ACTIVE &&
        subscription.current_period_end &&
        now < subscription.current_period_end;

      let periodStart = now;
      let baseDate = now;

      if (isRenewal && subscription) {
        baseDate = subscription.current_period_end;
        periodStart = subscription.current_period_start;
      }

      const periodEnd = new Date(baseDate.getTime());
      if (transaction.billing_interval === BillingInterval.YEARLY) {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      if (!subscription) {
        subscription = manager.create(Subscription, {
          company_id: transaction.company_id,
          plan_id: transaction.plan_id,
          status: SubscriptionStatus.ACTIVE,
          started_at: now,
          current_period_start: periodStart,
          current_period_end: periodEnd,
        });
      } else {
        subscription.plan_id = transaction.plan_id;
        subscription.status = SubscriptionStatus.ACTIVE;
        subscription.started_at = subscription.started_at || now;
        subscription.current_period_start = periodStart;
        subscription.current_period_end = periodEnd;
      }

      const savedSub = await manager.save(Subscription, subscription);
      transaction.subscription_id = savedSub.id;
      const savedTx = await manager.save(PaymentTransaction, transaction);

      await this.auditLogsService.logAction({
        entityManager: manager,
        companyId: transaction.company_id,
        userId: userId || transaction.user_id || null,
        action: 'PAYMENT_CAPTURED',
        entityType: 'PAYMENT_TRANSACTION',
        entityId: savedTx.id,
        metadata: {
          paymentId,
          amount: transaction.amount,
          billingInterval: transaction.billing_interval,
        },
      });

      await this.auditLogsService.logAction({
        entityManager: manager,
        companyId: transaction.company_id,
        userId: userId || transaction.user_id || null,
        action: isRenewal ? 'SUBSCRIPTION_RENEWED' : 'SUBSCRIPTION_PAYMENT_ACTIVATED',
        entityType: 'SUBSCRIPTION',
        entityId: savedSub.id,
        metadata: {
          planId: transaction.plan_id,
          currentPeriodEnd: periodEnd.toISOString(),
        },
      });

      return {
        success: true,
        transactionId: savedTx.id,
        status: savedTx.status,
        subscription: savedSub,
      };
    });
  }

  async processWebhook(rawBody: string | Buffer, signature: string) {
    const isValid = this.razorpayService.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'),
    );

    const eventId = payload.event_id || `evt_${Date.now()}`;
    const eventType = payload.event || 'unknown';

    const existingEvent = await this.webhookEventRepository.findOne({
      where: { event_id: eventId },
    });

    if (existingEvent) {
      return { received: true, duplicate: true };
    }

    const webhookEvent = this.webhookEventRepository.create({
      event_id: eventId,
      event_type: eventType,
      payload,
      processed_at: new Date(),
    });
    await this.webhookEventRepository.save(webhookEvent);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const tx = await this.transactionRepository.findOne({
          where: { razorpay_order_id: orderId },
        });

        if (tx && tx.status !== PaymentTransactionStatus.CAPTURED && paymentId) {
          await this.executePaymentCaptureAndSubscription(
            tx,
            paymentId,
            null,
            paymentEntity?.method || 'card',
          );
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;

      if (orderId) {
        const tx = await this.transactionRepository.findOne({
          where: { razorpay_order_id: orderId },
        });

        if (tx && tx.status === PaymentTransactionStatus.CREATED) {
          tx.status = PaymentTransactionStatus.FAILED;
          tx.failure_reason =
            paymentEntity?.error_description || 'Payment failed on Razorpay';
          await this.transactionRepository.save(tx);

          await this.auditLogsService.logAction({
            companyId: tx.company_id,
            userId: tx.user_id || null,
            action: 'PAYMENT_FAILED',
            entityType: 'PAYMENT_TRANSACTION',
            entityId: tx.id,
            metadata: {
              orderId,
              reason: tx.failure_reason,
            },
          });
        }
      }
    }

    return { received: true };
  }

  async findAllPayments(companyId: string, query: PaymentQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { company_id: companyId };
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await this.transactionRepository.findAndCount({
      where,
      relations: { plan: true },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOnePayment(companyId: string, id: string) {
    const tx = await this.transactionRepository.findOne({
      where: { id, company_id: companyId },
      relations: { plan: true, subscription: true },
    });

    if (!tx) {
      throw new NotFoundException(`Payment transaction '${id}' not found`);
    }

    return tx;
  }
}
