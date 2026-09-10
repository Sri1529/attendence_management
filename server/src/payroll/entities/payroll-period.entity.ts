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
import { User } from '../../users/entities/user.entity.js';

export enum PayrollPeriodStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  CORRECTION_REQUIRED = 'CORRECTION_REQUIRED',
}

@Entity('payroll_periods')
@Unique(['company_id', 'period_year', 'period_month'])
@Index(['company_id', 'period_year', 'period_month'])
@Index(['company_id', 'status'])
export class PayrollPeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  company_id!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'integer' })
  period_year!: number;

  @Column({ type: 'integer' })
  period_month!: number;

  @Column({ type: 'date' })
  start_date!: string;

  @Column({ type: 'date' })
  end_date!: string;

  @Column({
    type: 'enum',
    enum: PayrollPeriodStatus,
    default: PayrollPeriodStatus.DRAFT,
  })
  status!: PayrollPeriodStatus;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by_user?: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  finalized_at?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  paid_at?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
