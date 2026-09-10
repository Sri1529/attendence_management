import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { LeaveStatus } from '../entities/leave-record.entity.js';

export class CreateLeaveRecordDto {
  @IsUUID('4')
  @IsNotEmpty()
  employeeId!: string;

  @IsUUID('4')
  @IsNotEmpty()
  leaveTypeId!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsEnum(LeaveStatus)
  @IsOptional()
  status?: LeaveStatus;

  @IsBoolean()
  @IsOptional()
  is_paid?: boolean;
}
