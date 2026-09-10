import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { LeaveStatus } from '../entities/leave-record.entity.js';

export class UpdateLeaveRecordDto {
  @IsUUID('4')
  @IsOptional()
  leaveTypeId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsEnum(LeaveStatus)
  @IsOptional()
  status?: LeaveStatus;

  @IsBoolean()
  @IsOptional()
  is_paid?: boolean | null;
}
