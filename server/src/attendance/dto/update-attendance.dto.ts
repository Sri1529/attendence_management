import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '../entities/attendance.entity.js';

export class UpdateAttendanceDto {
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @IsString()
  @IsOptional()
  remarks?: string;
}
