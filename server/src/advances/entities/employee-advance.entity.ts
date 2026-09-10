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
import { Employee } from '../../employees/entities/employee.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum AdvanceStatus {
  ACTIVE = 'ACTIVE',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

@Entity('employee_advances')
@Unique(['company_id', 'advance_number'])
@Index(['company_id', 'employee_id', 'status'])
export class EmployeeAdvance {
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

  @Column({ type: 'varchar', length: 50 })
  advance_number!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'date' })
  advance_date!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({
    type: 'enum',
    enum: AdvanceStatus,
    default: AdvanceStatus.ACTIVE,
  })
  status!: AdvanceStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

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
