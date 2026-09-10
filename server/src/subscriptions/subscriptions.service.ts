import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity.js';
import { SubscriptionPlan, PlanStatus } from './entities/subscription-plan.entity.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto.js';

export interface CompanySubscriptionResult {
  id: string | null;
  company_id: string;
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus | null;
  rawStatus?: SubscriptionStatus;
  trialStartAt?: Date | null;
  trialEndAt?: Date | null;
  startedAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelledAt?: Date | null;
  accessAllowed: boolean;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async startTrial(companyId: string, userId?: string): Promise<CompanySubscriptionResult> {
    const existing = await this.subscriptionRepository.findOne({
      where: [
        { company_id: companyId, status: SubscriptionStatus.TRIAL },
        { company_id: companyId, status: SubscriptionStatus.ACTIVE },
      ],
    });

    if (existing) {
      throw new ConflictException(
        'Company already has an active or trial subscription',
      );
    }

    const freePlan = await this.planRepository.findOne({
      where: { code: 'FREE', status: PlanStatus.ACTIVE },
    });

    const plan = freePlan || (await this.planRepository.findOne({ where: { status: PlanStatus.ACTIVE } }));

    if (!plan) {
      throw new NotFoundException('No active subscription plan found');
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + plan.trial_days * 24 * 60 * 60 * 1000);

    const subscription = this.subscriptionRepository.create({
      company_id: companyId,
      plan_id: plan.id,
      status: SubscriptionStatus.TRIAL,
      trial_start_at: now,
      trial_end_at: trialEnd,
      started_at: now,
      current_period_start: now,
      current_period_end: trialEnd,
    });

    const saved = await this.subscriptionRepository.save(subscription);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'SUBSCRIPTION_TRIAL_STARTED',
      entityType: 'SUBSCRIPTION',
      entityId: saved.id,
      metadata: {
        planCode: plan.code,
        trialEndAt: trialEnd.toISOString(),
      },
    });

    return this.getCompanySubscription(companyId);
  }

  async getCompanySubscription(companyId: string): Promise<CompanySubscriptionResult> {
    let sub = await this.subscriptionRepository.findOne({
      where: { company_id: companyId },
      relations: { plan: true },
      order: { created_at: 'DESC' },
    });

    if (!sub) {
      try {
        return await this.startTrial(companyId);
      } catch {
        sub = await this.subscriptionRepository.findOne({
          where: { company_id: companyId },
          relations: { plan: true },
          order: { created_at: 'DESC' },
        });
      }
    }

    if (!sub) {
      return {
        id: null,
        company_id: companyId,
        plan: null,
        status: null,
        accessAllowed: false,
      };
    }

    const now = new Date();
    let effectiveStatus: SubscriptionStatus = sub.status;
    let accessAllowed = false;

    if (sub.status === SubscriptionStatus.TRIAL) {
      if (sub.trial_end_at && now < sub.trial_end_at) {
        effectiveStatus = SubscriptionStatus.TRIAL;
        accessAllowed = true;
      } else {
        effectiveStatus = SubscriptionStatus.EXPIRED;
        accessAllowed = false;
      }
    } else if (sub.status === SubscriptionStatus.ACTIVE) {
      if (sub.current_period_end && now < sub.current_period_end) {
        effectiveStatus = SubscriptionStatus.ACTIVE;
        accessAllowed = true;
      } else {
        effectiveStatus = SubscriptionStatus.EXPIRED;
        accessAllowed = false;
      }
    } else {
      effectiveStatus = sub.status;
      accessAllowed = false;
    }

    return {
      id: sub.id,
      company_id: sub.company_id,
      plan: sub.plan,
      status: effectiveStatus,
      rawStatus: sub.status,
      trialStartAt: sub.trial_start_at,
      trialEndAt: sub.trial_end_at,
      startedAt: sub.started_at,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelledAt: sub.cancelled_at,
      accessAllowed,
    };
  }

  async getPlans() {
    return this.planRepository.find({
      where: { status: PlanStatus.ACTIVE },
      order: { price_monthly: 'ASC' },
    });
  }

  async cancelSubscription(
    companyId: string,
    userId: string,
    dto?: CancelSubscriptionDto,
  ): Promise<CompanySubscriptionResult> {
    const sub = await this.subscriptionRepository.findOne({
      where: [
        { company_id: companyId, status: SubscriptionStatus.TRIAL },
        { company_id: companyId, status: SubscriptionStatus.ACTIVE },
      ],
      relations: { plan: true },
    });

    if (!sub) {
      throw new BadRequestException('No active or trial subscription to cancel');
    }

    const now = new Date();
    sub.status = SubscriptionStatus.CANCELLED;
    sub.cancelled_at = now;
    await this.subscriptionRepository.save(sub);

    await this.auditLogsService.logAction({
      companyId,
      userId,
      action: 'SUBSCRIPTION_CANCELLED',
      entityType: 'SUBSCRIPTION',
      entityId: sub.id,
      metadata: {
        reason: dto?.reason || 'User cancelled',
      },
    });

    return this.getCompanySubscription(companyId);
  }
}
