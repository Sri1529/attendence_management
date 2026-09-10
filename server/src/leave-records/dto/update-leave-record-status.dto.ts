import { IsEnum, IsNotEmpty } from 'class-validator';
import { LeaveStatus } from '../entities/leave-record.entity.js';

export class UpdateLeaveRecordStatusDto {
  @IsEnum(LeaveStatus)
  @IsNotEmpty()
  status!: LeaveStatus;
}
