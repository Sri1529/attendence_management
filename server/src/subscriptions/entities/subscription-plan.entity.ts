import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

@Entity('subscription_plans')
@Unique(['code'])
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: BillingInterval.MONTHLY,
  })
  billing_interval!: BillingInterval;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  price!: string;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({ type: 'integer', default: 25 })
  max_employees!: number;

  @Column({ type: 'integer', default: 5 })
  max_users!: number;

  @Column({ type: 'jsonb', nullable: true })
  features?: string[] | null;

  @Column({ type: 'integer', default: 0 })
  display_order!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  price_monthly!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  price_yearly!: string;

  @Column({ type: 'integer', default: 14 })
  trial_days!: number;

  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.ACTIVE,
  })
  status!: PlanStatus;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
