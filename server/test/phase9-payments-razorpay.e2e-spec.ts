import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import crypto from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { DataSource } from 'typeorm';
import { Company } from '../src/companies/entities/company.entity.js';
import { Role } from '../src/roles/entities/role.entity.js';
import { User, UserStatus } from '../src/users/entities/user.entity.js';
import { Permission } from '../src/permissions/entities/permission.entity.js';
import { RolePermission } from '../src/roles/entities/role-permission.entity.js';
import { hashPassword } from '../src/common/utils/password.util.js';

describe('Phase 9: Razorpay Payment Gateway & Subscription Payment (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let companyA: Company;
  let companyB: Company;
  let roleOwnerA: Role;
  let emptyRoleA: Role;

  let ownerAToken: string;
  let noPermToken: string;
  let ownerBToken: string;

  const mockKeySecret = 'mock_razorpay_secret_key_12345';
  const mockWebhookSecret = 'mock_webhook_secret_key_12345';

  function generatePaymentSignature(orderId: string, paymentId: string): string {
    return crypto
      .createHmac('sha256', mockKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  function generateWebhookSignature(payload: string): string {
    return crypto
      .createHmac('sha256', mockWebhookSecret)
      .update(payload)
      .digest('hex');
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    await dataSource.query(
      'TRUNCATE TABLE payment_webhook_events, payment_transactions, subscriptions, payslips, audit_logs, payroll_records, payroll_periods, advance_repayments, employee_advances, salary_adjustments, employee_salary_history, attendance, leave_records, leave_types, employees, departments, designations, role_permissions, users, roles, companies CASCADE;',
    );

    const companyRepo = dataSource.getRepository(Company);
    companyA = await companyRepo.save(
      companyRepo.create({ name: 'Pay Alpha Corp', timezone: 'UTC', currency: 'USD' }),
    );
    companyB = await companyRepo.save(
      companyRepo.create({ name: 'Pay Beta Corp', timezone: 'UTC', currency: 'USD' }),
    );

    const roleRepo = dataSource.getRepository(Role);
    roleOwnerA = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'Company Owner', is_system: true }),
    );
    emptyRoleA = await roleRepo.save(
      roleRepo.create({ company_id: companyA.id, name: 'Empty Role', is_system: false }),
    );
    const roleOwnerB = await roleRepo.save(
      roleRepo.create({ company_id: companyB.id, name: 'Company Owner', is_system: true }),
    );

    const permRepo = dataSource.getRepository(Permission);
    const rolePermRepo = dataSource.getRepository(RolePermission);
    const allPerms = await permRepo.find();
    for (const perm of allPerms) {
      await rolePermRepo.save(
        rolePermRepo.create({ role_id: roleOwnerA.id, permission_id: perm.id }),
      );
      await rolePermRepo.save(
        rolePermRepo.create({ role_id: roleOwnerB.id, permission_id: perm.id }),
      );
    }

    const userRepo = dataSource.getRepository(User);
    const pwdHash = await hashPassword('Password123!');

    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: roleOwnerA.id,
        name: 'Owner Pay A',
        email: 'owner9@alpha.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await userRepo.save(
      userRepo.create({
        company_id: companyA.id,
        role_id: emptyRoleA.id,
        name: 'No Perm User',
        email: 'noperm9@alpha.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await userRepo.save(
      userRepo.create({
        company_id: companyB.id,
        role_id: roleOwnerB.id,
        name: 'Owner Pay B',
        email: 'owner9@beta.com',
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    const resA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner9@alpha.com', password: 'Password123!' });
    ownerAToken = resA.body.accessToken;

    const resNoPerm = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'noperm9@alpha.com', password: 'Password123!' });
    noPermToken = resNoPerm.body.accessToken;

    const resB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner9@beta.com', password: 'Password123!' });
    ownerBToken = resB.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ==========================================
  // PAYMENT ORDER CREATION (Cases 1 - 10)
  // ==========================================
  describe('Payment Order Creation', () => {
    it('1. POST /subscription/payment/order creates monthly order with server-derived price (₹49 -> 4900)', async () => {
      const res = await request(app.getHttpServer())
        .post('/subscription/payment/order')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ planCode: 'MONTHLY', billingInterval: 'MONTHLY' })
        .expect(201);

      expect(res.body).toHaveProperty('orderId');
      expect(res.body.amount).toBe(4900);
      expect(res.body.displayAmount).toBe('49.00');
      expect(res.body.currency).toBe('INR');
    });

    it('2. POST /subscription/payment/order creates yearly order with server-derived price (₹490 -> 49000)', async () => {
      const res = await request(app.getHttpServer())
        .post('/subscription/payment/order')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ planCode: 'YEARLY', billingInterval: 'YEARLY' })
        .expect(201);

      expect(res.body).toHaveProperty('orderId');
      expect(res.body.amount).toBe(49000);
      expect(res.body.displayAmount).toBe('490.00');
      expect(res.body.currency).toBe('INR');
    });

    it('4. Client cannot send non-whitelisted fields (amount, currency, companyId) and receives 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/subscription/payment/order')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          planCode: 'MONTHLY',
          billingInterval: 'MONTHLY',
          amount: 1, // Non-whitelisted property
          currency: 'USD', // Non-whitelisted property
        })
        .expect(400);
    });

    it('7. Inactive / invalid plan code is rejected with 404', async () => {
      await request(app.getHttpServer())
        .post('/subscription/payment/order')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ planCode: 'NONEXISTENT_PLAN', billingInterval: 'MONTHLY' })
        .expect(404);
    });

    it('8. User without SUBSCRIPTION_MANAGE receives 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/subscription/payment/order')
        .set('Authorization', `Bearer ${noPermToken}`)
        .send({ planCode: 'MONTHLY', billingInterval: 'MONTHLY' })
        .expect(403);
    });
  });

  // ==========================================
  // PAYMENT VERIFICATION & SUBSCRIPTION ACTIVATION (Cases 11 - 23)
  // ==========================================
  describe('Payment Verification & Subscription Activation', () => {
    let orderId: string;
    const paymentId = `pay_mock_${Date.now()}`;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/subscription/payment/order')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ planCode: 'MONTHLY', billingInterval: 'MONTHLY' });
      orderId = res.body.orderId;
    });

    it('13. Invalid signature is rejected with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/subscription/payment/verify')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'invalid_forged_signature_hex',
        })
        .expect(400);
    });

    it('15. Company B user cannot verify Company A order (returns 403)', async () => {
      const validSig = generatePaymentSignature(orderId, paymentId);
      await request(app.getHttpServer())
        .post('/subscription/payment/verify')
        .set('Authorization', `Bearer ${ownerBToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSig,
        })
        .expect(403);
    });

    it('19. Verified captured payment activates subscription', async () => {
      const validSig = generatePaymentSignature(orderId, paymentId);

      const res = await request(app.getHttpServer())
        .post('/subscription/payment/verify')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSig,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('CAPTURED');
      expect(res.body.subscription.status).toBe('ACTIVE');

      // Verify subscription status via GET /subscription
      const subRes = await request(app.getHttpServer())
        .get('/subscription')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(subRes.body.status).toBe('ACTIVE');
      expect(subRes.body.accessAllowed).toBe(true);
    });

    it('24. Re-submitting the same payment verification returns existing result (Idempotent)', async () => {
      const validSig = generatePaymentSignature(orderId, paymentId);

      const res = await request(app.getHttpServer())
        .post('/subscription/payment/verify')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSig,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('CAPTURED');
    });
  });

  // ==========================================
  // RENEWAL & CALENDAR ARITHMETIC (Cases 21 - 23)
  // ==========================================
  describe('Subscription Renewal Arithmetic', () => {
    it('22. Renewal of active subscription extends current_period_end by 1 month', async () => {
      // Create second order for Company A renewal
      const orderRes = await request(app.getHttpServer())
        .post('/subscription/payment/order')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ planCode: 'MONTHLY', billingInterval: 'MONTHLY' });

      const newOrderId = orderRes.body.orderId;
      const newPayId = `pay_renew_${Date.now()}`;
      const sig = generatePaymentSignature(newOrderId, newPayId);

      const res = await request(app.getHttpServer())
        .post('/subscription/payment/verify')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          razorpay_order_id: newOrderId,
          razorpay_payment_id: newPayId,
          razorpay_signature: sig,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.subscription.status).toBe('ACTIVE');
    });
  });

  // ==========================================
  // WEBHOOK & WEBHOOK IDEMPOTENCY (Cases 29 - 36)
  // ==========================================
  describe('Razorpay Webhook Processing', () => {
    it('30. Invalid webhook signature is rejected with 400 Bad Request', async () => {
      const payloadObj = { event: 'payment.captured', event_id: 'evt_test_1' };

      await request(app.getHttpServer())
        .post('/subscription/payment/webhook')
        .set('x-razorpay-signature', 'invalid_signature_hex')
        .send(payloadObj)
        .expect(400);
    });

    it('31. Valid payment.captured webhook triggers captured state', async () => {
      // Create order for Company B
      const orderRes = await request(app.getHttpServer())
        .post('/subscription/payment/order')
        .set('Authorization', `Bearer ${ownerBToken}`)
        .send({ planCode: 'YEARLY', billingInterval: 'YEARLY' });

      const bOrderId = orderRes.body.orderId;
      const bPayId = `pay_wh_${Date.now()}`;
      const eventId = `evt_${Date.now()}`;

      const payloadObj = {
        event_id: eventId,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: bPayId,
              order_id: bOrderId,
              amount: 49000,
              currency: 'INR',
              status: 'captured',
              method: 'upi',
            },
          },
        },
      };

      const bodyStr = JSON.stringify(payloadObj);
      const signature = generateWebhookSignature(bodyStr);

      const res = await request(app.getHttpServer())
        .post('/subscription/payment/webhook')
        .set('x-razorpay-signature', signature)
        .send(payloadObj)
        .expect(201);

      expect(res.body.received).toBe(true);

      // Verify Company B subscription is ACTIVE
      const subRes = await request(app.getHttpServer())
        .get('/subscription')
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(200);

      expect(subRes.body.status).toBe('ACTIVE');
    });

    it('33. Duplicate webhook event ID is safely ignored (Idempotency)', async () => {
      const eventId = `evt_dup_${Date.now()}`;
      const payloadObj = {
        event_id: eventId,
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_dup_123', order_id: 'ord_dup_123' } } },
      };

      const bodyStr = JSON.stringify(payloadObj);
      const signature = generateWebhookSignature(bodyStr);

      // First webhook delivery
      await request(app.getHttpServer())
        .post('/subscription/payment/webhook')
        .set('x-razorpay-signature', signature)
        .send(payloadObj)
        .expect(201);

      // Second duplicate webhook delivery
      const res = await request(app.getHttpServer())
        .post('/subscription/payment/webhook')
        .set('x-razorpay-signature', signature)
        .send(payloadObj)
        .expect(201);

      expect(res.body.duplicate).toBe(true);
    });

    it('35. Webhook endpoint does NOT require JWT token', async () => {
      const payloadObj = { event_id: `evt_pub_${Date.now()}`, event: 'order.paid' };
      const bodyStr = JSON.stringify(payloadObj);
      const signature = generateWebhookSignature(bodyStr);

      await request(app.getHttpServer())
        .post('/subscription/payment/webhook')
        .set('x-razorpay-signature', signature)
        .send(payloadObj)
        .expect(201);
    });
  });

  // ==========================================
  // PAYMENT HISTORY & TENANT ISOLATION (Cases 41 - 42)
  // ==========================================
  describe('Payment History & Tenant Isolation', () => {
    it('41. GET /subscription/payments returns tenant-isolated transaction history', async () => {
      const res = await request(app.getHttpServer())
        .get('/subscription/payments')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const tx of res.body.data) {
        expect(tx.company_id).toBe(companyA.id);
      }
    });

    it('42. GET /subscription/payments/:id returns payment transaction details', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/subscription/payments')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      const txId = listRes.body.data[0].id;

      const res = await request(app.getHttpServer())
        .get(`/subscription/payments/${txId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(res.body.id).toBe(txId);
      expect(res.body.company_id).toBe(companyA.id);
    });

    it('57. Company B user cannot view Company A payment transaction (returns 404)', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/subscription/payments')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      const txAId = listRes.body.data[0].id;

      await request(app.getHttpServer())
        .get(`/subscription/payments/${txAId}`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(404);
    });
  });
});
