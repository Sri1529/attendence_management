import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionStatus } from './entities/subscription.entity.js';
import { PlanStatus, BillingInterval } from './entities/subscription-plan.entity.js';
import { EmploymentStatus } from '../employees/entities/employee.entity.js';
import { UserStatus } from '../users/entities/user.entity.js';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let mockSubscriptionRepo: any;
  let mockPlanRepo: any;
  let mockEmployeeRepo: any;
  let mockUserRepo: any;
  let mockAuditLogsService: any;

  const mockStarterPlan = {
    id: 'plan-starter-m',
    code: 'STARTER_MONTHLY',
    name: 'Starter',
    billing_interval: BillingInterval.MONTHLY,
    price: '99.00',
    currency: 'INR',
    max_employees: 25,
    max_users: 5,
    status: PlanStatus.ACTIVE,
  };

  const mockBusinessPlan = {
    id: 'plan-business-m',
    code: 'BUSINESS_MONTHLY',
    name: 'Business',
    billing_interval: BillingInterval.MONTHLY,
    price: '249.00',
    currency: 'INR',
    max_employees: 75,
    max_users: 15,
    status: PlanStatus.ACTIVE,
  };

  const mockSmallPlan = {
    id: 'plan-starter-m',
    code: 'STARTER_MONTHLY',
    name: 'Starter',
    billing_interval: BillingInterval.MONTHLY,
    price: '99.00',
    currency: 'INR',
    max_employees: 25,
    max_users: 5,
    status: PlanStatus.ACTIVE,
  };

  beforeEach(() => {
    mockSubscriptionRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((dto) => ({ id: 'sub-1', ...dto })),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    mockPlanRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockEmployeeRepo = {
      count: vi.fn(),
    };

    mockUserRepo = {
      count: vi.fn(),
    };

    mockAuditLogsService = {
      logAction: vi.fn().mockResolvedValue(true),
    };

    service = new SubscriptionsService(
      mockSubscriptionRepo,
      mockPlanRepo,
      mockEmployeeRepo,
      mockUserRepo,
      mockAuditLogsService,
    );
  });

  describe('startTrial', () => {
    it('should create a 14-day free trial subscription with Starter limits', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValue(null);
      mockPlanRepo.findOne.mockResolvedValue(mockStarterPlan);
      mockEmployeeRepo.count.mockResolvedValue(0);
      mockUserRepo.count.mockResolvedValue(1);

      const result = await service.startTrial('company-123');

      expect(mockSubscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-123',
          plan_id: mockStarterPlan.id,
          status: SubscriptionStatus.TRIAL,
        }),
      );
      expect(result.status).toBe(SubscriptionStatus.TRIAL);
      expect(result.accessAllowed).toBe(true);
      expect(result.maxEmployees).toBe(25);
      expect(result.maxUsers).toBe(5);
    });
  });

  describe('validateEmployeeLimit', () => {
    it('should allow employee creation when active employee count is below plan limit', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      mockSubscriptionRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        company_id: 'comp-1',
        plan: mockStarterPlan,
        status: SubscriptionStatus.TRIAL,
        trial_end_at: future,
      });
      mockEmployeeRepo.count.mockResolvedValue(10); // Below 25
      mockUserRepo.count.mockResolvedValue(2);

      await expect(
        service.validateEmployeeLimit('comp-1'),
      ).resolves.not.toThrow();
    });

    it('should reject employee creation when active employee count reaches plan limit', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      mockSubscriptionRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        company_id: 'comp-1',
        plan: mockStarterPlan,
        status: SubscriptionStatus.TRIAL,
        trial_end_at: future,
      });
      mockEmployeeRepo.count.mockResolvedValue(25); // At limit
      mockUserRepo.count.mockResolvedValue(2);

      await expect(service.validateEmployeeLimit('comp-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateEmployeeLimit('comp-1')).rejects.toThrow(
        'Your current plan allows up to 25 active employees. Please upgrade your plan to add more employees.',
      );
    });
  });

  describe('validateUserLimit', () => {
    it('should allow user creation when active user count is below limit', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      mockSubscriptionRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        company_id: 'comp-1',
        plan: mockStarterPlan,
        status: SubscriptionStatus.ACTIVE,
        current_period_end: future,
      });
      mockEmployeeRepo.count.mockResolvedValue(5);
      mockUserRepo.count.mockResolvedValue(3); // Below 5

      await expect(service.validateUserLimit('comp-1')).resolves.not.toThrow();
    });

    it('should reject user creation when active user count reaches plan limit', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      mockSubscriptionRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        company_id: 'comp-1',
        plan: mockStarterPlan,
        status: SubscriptionStatus.ACTIVE,
        current_period_end: future,
      });
      mockEmployeeRepo.count.mockResolvedValue(5);
      mockUserRepo.count.mockResolvedValue(5); // At limit

      await expect(service.validateUserLimit('comp-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateUserLimit('comp-1')).rejects.toThrow(
        'Your current plan allows up to 5 active users. Please upgrade your plan to add more users.',
      );
    });
  });

  describe('validatePlanDowngrade', () => {
    it('should reject downgrade if active employee usage exceeds target plan limits', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      mockSubscriptionRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        company_id: 'comp-1',
        plan: mockBusinessPlan,
        status: SubscriptionStatus.ACTIVE,
        current_period_end: future,
      });
      mockEmployeeRepo.count.mockResolvedValue(50); // Exceeds Starter 25
      mockUserRepo.count.mockResolvedValue(4);

      await expect(
        service.validatePlanDowngrade('comp-1', mockSmallPlan as any),
      ).rejects.toThrow(
        'You cannot downgrade to this plan because your company currently has more employees or users than the plan allows.',
      );
    });

    it('should allow downgrade if current usage fits within target plan limits', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      mockSubscriptionRepo.findOne.mockResolvedValue({
        id: 'sub-1',
        company_id: 'comp-1',
        plan: mockBusinessPlan,
        status: SubscriptionStatus.ACTIVE,
        current_period_end: future,
      });
      mockEmployeeRepo.count.mockResolvedValue(15); // Fits in Starter 25
      mockUserRepo.count.mockResolvedValue(3); // Fits in Starter 5

      await expect(
        service.validatePlanDowngrade('comp-1', mockSmallPlan as any),
      ).resolves.not.toThrow();
    });
  });
});
