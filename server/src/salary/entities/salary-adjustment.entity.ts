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
import { Employee } from '../../employees/entities/employee.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum AdjustmentType {
  OVERTIME = 'OVERTIME',
  BONUS = 'BONUS',
  INCENTIVE = 'INCENTIVE',
  OTHER_EARNING = 'OTHER_EARNING',
  OTHER_DEDUCTION = 'OTHER_DEDUCTION',
}

export enum AdjustmentStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

@Entity('salary_adjustments')
@Index(['company_id', 'employee_id', 'adjustment_date'])
export class SalaryAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  company_id!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'uuid' })
  employee_id!: string;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({
    type: 'enum',
    enum: AdjustmentType,
  })
  adjustment_type!: AdjustmentType;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'date' })
  adjustment_date!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: AdjustmentStatus,
    default: AdjustmentStatus.ACTIVE,
  })
  status!: AdjustmentStatus;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by_user?: User | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
