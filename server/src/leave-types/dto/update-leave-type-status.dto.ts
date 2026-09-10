import { IsEnum, IsNotEmpty } from 'class-validator';
import { LeaveTypeStatus } from '../entities/leave-type.entity.js';

export class UpdateLeaveTypeStatusDto {
  @IsEnum(LeaveTypeStatus)
  @IsNotEmpty()
  status!: LeaveTypeStatus;
}
