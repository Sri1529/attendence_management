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
import { Employee } from '../../employees/entities/employee.entity.js';
import { EmployeeLoan } from './employee-loan.entity.js';
import { PayrollRecord } from '../../payroll/entities/payroll-record.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('loan_repayments')
@Index(['company_id', 'loan_id', 'repayment_date'])
@Index(['company_id', 'employee_id'])
export class LoanRepayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  company_id!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'uuid' })
  loan_id!: string;

  @ManyToOne(() => EmployeeLoan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loan_id' })
  loan!: EmployeeLoan;

  @Column({ type: 'uuid' })
  employee_id!: string;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'uuid', nullable: true })
  payroll_record_id?: string | null;

  @ManyToOne(() => PayrollRecord, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payroll_record_id' })
  payroll_record?: PayrollRecord | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  repayment_amount!: string;

  @Column({ type: 'date' })
  repayment_date!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  previous_outstanding_amount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  remaining_outstanding_amount!: string;

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
