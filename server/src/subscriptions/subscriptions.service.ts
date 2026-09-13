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
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity.js';
import { User, UserStatus } from '../users/entities/user.entity.js';
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
  startedAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelledAt?: Date | null;
  accessAllowed: boolean;
  daysRemaining: number;
  maxEmployees: number;
  maxUsers: number;
  activeEmployeeCount: number;
  activeUserCount: number;
  employeeUsagePercentage: number;
  userUsagePercentage: number;
  isTrialActive: boolean;
  isExpired: boolean;
  availableActions: string[];
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

    const starterPlan = await this.planRepository.findOne({
      where: { code: 'STARTER_MONTHLY', status: PlanStatus.ACTIVE },
    });

    const plan = starterPlan || (await this.planRepository.findOne({ where: { status: PlanStatus.ACTIVE } }));

    if (!plan) {
      throw new NotFoundException('No active subscription plan found');
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

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

    const activeEmployeeCount = await this.employeeRepository.count({
      where: { company_id: companyId, employment_status: EmploymentStatus.ACTIVE },
    });

    const activeUserCount = await this.userRepository.count({
      where: { company_id: companyId, status: UserStatus.ACTIVE },
    });

    if (!sub) {
      return {
        id: null,
        company_id: companyId,
        plan: null,
        status: null,
        accessAllowed: false,
        daysRemaining: 0,
        maxEmployees: 25,
        maxUsers: 5,
        activeEmployeeCount,
        activeUserCount,
        employeeUsagePercentage: Math.min(100, Math.round((activeEmployeeCount / 25) * 100)),
        userUsagePercentage: Math.min(100, Math.round((activeUserCount / 5) * 100)),
        isTrialActive: false,
        isExpired: true,
        availableActions: ['SUBSCRIBE'],
      };
    }

    const now = new Date();
    let effectiveStatus: SubscriptionStatus = sub.status;
    let accessAllowed = false;
    let daysRemaining = 0;

    if (sub.status === SubscriptionStatus.TRIAL) {
      if (sub.trial_end_at && now < sub.trial_end_at) {
        effectiveStatus = SubscriptionStatus.TRIAL;
        accessAllowed = true;
        daysRemaining = Math.max(
          0,
          Math.ceil((sub.trial_end_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        );
      } else {
        effectiveStatus = SubscriptionStatus.EXPIRED;
        accessAllowed = false;
      }
    } else if (sub.status === SubscriptionStatus.ACTIVE) {
      if (sub.current_period_end && now < sub.current_period_end) {
        effectiveStatus = SubscriptionStatus.ACTIVE;
        accessAllowed = true;
        daysRemaining = Math.max(
          0,
          Math.ceil((sub.current_period_end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        );
      } else {
        effectiveStatus = SubscriptionStatus.EXPIRED;
        accessAllowed = false;
      }
    } else {
      effectiveStatus = sub.status;
      accessAllowed = false;
    }

    const maxEmployees = sub.plan?.max_employees || 25;
    const maxUsers = sub.plan?.max_users || 5;

    const employeeUsagePercentage = maxEmployees > 0
      ? Math.min(100, Math.round((activeEmployeeCount / maxEmployees) * 100))
      : 0;

    const userUsagePercentage = maxUsers > 0
      ? Math.min(100, Math.round((activeUserCount / maxUsers) * 100))
      : 0;

    const availableActions: string[] = [];
    if (effectiveStatus === SubscriptionStatus.TRIAL || effectiveStatus === SubscriptionStatus.EXPIRED || effectiveStatus === SubscriptionStatus.CANCELLED) {
      availableActions.push('SUBSCRIBE');
    }
    if (effectiveStatus === SubscriptionStatus.ACTIVE) {
      availableActions.push('UPGRADE', 'DOWNGRADE', 'CANCEL');
    }

    return {
      id: sub.id,
      company_id: sub.company_id,
      plan: sub.plan,
      status: effectiveStatus,
      rawStatus: sub.status,
      trialStartAt: sub.trial_start_at || null,
      trialEndAt: sub.trial_end_at || null,
      startedAt: sub.started_at || null,
      currentPeriodStart: sub.current_period_start || null,
      currentPeriodEnd: sub.current_period_end || null,
      cancelledAt: sub.cancelled_at || null,
      accessAllowed,
      daysRemaining,
      maxEmployees,
      maxUsers,
      activeEmployeeCount,
      activeUserCount,
      employeeUsagePercentage,
      userUsagePercentage,
      isTrialActive: effectiveStatus === SubscriptionStatus.TRIAL,
      isExpired: effectiveStatus === SubscriptionStatus.EXPIRED,
      availableActions,
    };
  }

  async validateEmployeeLimit(companyId: string): Promise<void> {
    const subInfo = await this.getCompanySubscription(companyId);
    const maxEmployees = subInfo.maxEmployees || 25;

    if (subInfo.activeEmployeeCount >= maxEmployees) {
      throw new BadRequestException(
        `Your current plan allows up to ${maxEmployees} active employees. Please upgrade your plan to add more employees.`,
      );
    }
  }

  async validateUserLimit(companyId: string): Promise<void> {
    const subInfo = await this.getCompanySubscription(companyId);
    const maxUsers = subInfo.maxUsers || 5;

    if (subInfo.activeUserCount >= maxUsers) {
      throw new BadRequestException(
        `Your current plan allows up to ${maxUsers} active users. Please upgrade your plan to add more users.`,
      );
    }
  }

  async validatePlanDowngrade(
    companyId: string,
    targetPlan: SubscriptionPlan,
  ): Promise<void> {
    const subInfo = await this.getCompanySubscription(companyId);

    if (
      subInfo.activeEmployeeCount > targetPlan.max_employees ||
      subInfo.activeUserCount > targetPlan.max_users
    ) {
      throw new BadRequestException(
        'You cannot downgrade to this plan because your company currently has more employees or users than the plan allows.',
      );
    }
  }

  async getPlans() {
    return this.planRepository.find({
      where: { status: PlanStatus.ACTIVE },
      order: { display_order: 'ASC', price: 'ASC' },
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
