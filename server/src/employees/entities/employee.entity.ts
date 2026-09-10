import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { Department } from '../../departments/entities/department.entity.js';
import { Designation } from '../../designations/entities/designation.entity.js';

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_NOTICE = 'ON_NOTICE',
  TERMINATED = 'TERMINATED',
}

@Entity('employees')
@Unique(['company_id', 'employee_code'])
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  company_id!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'varchar', length: 50 })
  employee_code!: string;

  @Column({ type: 'varchar', length: 100 })
  first_name!: string;

  @Column({ type: 'varchar', length: 100 })
  last_name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string | null;

  @Column({ type: 'date' })
  joining_date!: string;

  @Column({ type: 'uuid', nullable: true })
  department_id?: string | null;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  @Column({ type: 'uuid', nullable: true })
  designation_id?: string | null;

  @ManyToOne(() => Designation, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'designation_id' })
  designation?: Designation | null;

  @Column({
    type: 'enum',
    enum: EmploymentStatus,
    default: EmploymentStatus.ACTIVE,
  })
  employment_status!: EmploymentStatus;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
