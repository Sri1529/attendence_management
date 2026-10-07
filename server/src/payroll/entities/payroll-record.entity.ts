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
import { PayrollPeriod } from './payroll-period.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum PayrollRecordStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  PAID = 'PAID',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
  OTHER = 'OTHER',
}

@Entity('payroll_records')
@Unique(['company_id', 'payroll_period_id', 'employee_id'])
@Index(['company_id', 'payroll_period_id'])
@Index(['company_id', 'employee_id'])
export class PayrollRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  company_id!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'uuid' })
  payroll_period_id!: string;

  @ManyToOne(() => PayrollPeriod, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payroll_period_id' })
  payroll_period!: PayrollPeriod;

  @Column({ type: 'uuid' })
  employee_id!: string;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  basic_salary!: string;

  @Column({ type: 'integer', default: 0 })
  working_days!: number;

  @Column({ type: 'integer', default: 0 })
  present_days!: number;

  @Column({ type: 'integer', default: 0 })
  absent_days!: number;

  @Column({ type: 'integer', default: 0 })
  half_days!: number;

  @Column({ type: 'integer', default: 0 })
  leave_days!: number;

  @Column({ type: 'integer', default: 0 })
  paid_leave_days!: number;

  @Column({ type: 'integer', default: 0 })
  unpaid_leave_days!: number;

  @Column({ type: 'integer', default: 0 })
  holiday_days!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  overtime_amount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  bonus_amount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  incentive_amount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  other_earnings!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  absence_deduction!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  unpaid_leave_deduction!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  other_deductions!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  advance_deduction!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  loan_deduction!: string;

  @Column({ type: 'varchar', length: 20, default: 'AUTOMATIC' })
  absence_deduction_mode!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  gross_salary!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total_deductions!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  net_salary!: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  calculated_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finalized_at?: Date | null;

  @Column({
    type: 'enum',
    enum: PayrollRecordStatus,
    default: PayrollRecordStatus.DRAFT,
  })
  status!: PayrollRecordStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  payment_status!: PaymentStatus;

  @Column({ type: 'date', nullable: true })
  payment_date?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_reference?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paid_at?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  paid_by?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'paid_by' })
  paid_by_user?: User | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
