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
import { PayrollRecord } from '../../payroll/entities/payroll-record.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';

@Entity('payslips')
@Unique(['company_id', 'payroll_record_id'])
@Unique(['company_id', 'payslip_number'])
@Index(['company_id', 'employee_id'])
@Index(['company_id', 'payslip_number'])
export class Payslip {
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

  @Column({ type: 'varchar', length: 50 })
  payslip_number!: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  issued_at!: Date;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
