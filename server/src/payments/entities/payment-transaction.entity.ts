import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { Subscription } from '../../subscriptions/entities/subscription.entity.js';
import { SubscriptionPlan } from '../../subscriptions/entities/subscription-plan.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum PaymentTransactionStatus {
  CREATED = 'CREATED',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

@Entity('payment_transactions')
@Unique(['razorpay_order_id'])
@Index(['company_id', 'created_at'])
@Index(['company_id', 'status'])
@Index(['company_id', 'subscription_id'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  company_id!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'uuid', nullable: true })
  subscription_id?: string | null;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: Subscription | null;

  @Column({ type: 'uuid' })
  plan_id!: string;

  @ManyToOne(() => SubscriptionPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan!: SubscriptionPlan;

  @Column({ type: 'uuid', nullable: true })
  user_id?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ type: 'varchar', length: 100 })
  razorpay_order_id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  razorpay_payment_id?: string | null;

  @Column({ type: 'text', nullable: true })
  razorpay_signature?: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: BillingInterval,
    default: BillingInterval.MONTHLY,
  })
  billing_interval!: BillingInterval;

  @Column({
    type: 'enum',
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.CREATED,
  })
  status!: PaymentTransactionStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method?: string | null;

  @Column({ type: 'text', nullable: true })
  failure_reason?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paid_at?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
