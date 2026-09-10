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
import { LeaveRecord } from '../../leave-records/entities/leave-record.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  LEAVE = 'LEAVE',
  HOLIDAY = 'HOLIDAY',
}

@Entity('attendance')
@Unique(['company_id', 'employee_id', 'attendance_date'])
@Index(['company_id', 'attendance_date'])
@Index(['company_id', 'employee_id', 'attendance_date'])
export class Attendance {
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

  @Column({ type: 'uuid', nullable: true })
  leave_record_id?: string | null;

  @ManyToOne(() => LeaveRecord, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'leave_record_id' })
  leave_record?: LeaveRecord | null;

  @Column({ type: 'date' })
  attendance_date!: string;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status!: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by_user?: User | null;

  @Column({ type: 'uuid', nullable: true })
  updated_by?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updated_by_user?: User | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: Date;
}
