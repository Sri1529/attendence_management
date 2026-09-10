import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { EmployeeAdvance } from './employee-advance.entity.js';
import { PayrollRecord } from '../../payroll/entities/payroll-record.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('advance_repayments')
@Index(['company_id', 'advance_id', 'repayment_date'])
export class AdvanceRepayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  company_id!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'uuid' })
  advance_id!: string;

  @ManyToOne(() => EmployeeAdvance, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'advance_id' })
  advance!: EmployeeAdvance;

  @Column({ type: 'uuid', nullable: true })
  payroll_record_id?: string | null;

  @ManyToOne(() => PayrollRecord, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payroll_record_id' })
  payroll_record?: PayrollRecord | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'date' })
  repayment_date!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by_user?: User | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
