import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { PayrollRecord } from './payroll-record.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum PayrollCorrectionType {
  ABSENCE_DEDUCTION_REVERSAL = 'ABSENCE_DEDUCTION_REVERSAL',
  ABSENCE_DEDUCTION_ADJUSTMENT = 'ABSENCE_DEDUCTION_ADJUSTMENT',
  PAID_LEAVE_ADJUSTMENT = 'PAID_LEAVE_ADJUSTMENT',
  UNPAID_LEAVE_ADJUSTMENT = 'UNPAID_LEAVE_ADJUSTMENT',
  SALARY_ADJUSTMENT = 'SALARY_ADJUSTMENT',
  ADVANCE_ADJUSTMENT = 'ADVANCE_ADJUSTMENT',
  OTHER = 'OTHER',
}

export enum PayrollCorrectionStatus {
  PENDING = 'PENDING',
  APPLIED = 'APPLIED',
  REVERSED = 'REVERSED',
}

@Entity('payroll_corrections')
@Index(['company_id', 'payroll_record_id'])
@Index(['company_id', 'employee_id'])
export class PayrollCorrection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  company_id!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'uuid' })
  payroll_record_id!: string;

  @ManyToOne(() => PayrollRecord, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payroll_record_id' })
  payroll_record!: PayrollRecord;

  @Column({ type: 'uuid' })
  employee_id!: string;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({
    type: 'enum',
    enum: PayrollCorrectionType,
    default: PayrollCorrectionType.OTHER,
  })
  correction_type!: PayrollCorrectionType;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({
    type: 'enum',
    enum: PayrollCorrectionStatus,
    default: PayrollCorrectionStatus.APPLIED,
  })
  status!: PayrollCorrectionStatus;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by_user?: User | null;

  @Column({ type: 'uuid', nullable: true })
  approved_by?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approved_by_user?: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  applied_at?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  reversed_at?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  reversal_correction_id?: string | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
