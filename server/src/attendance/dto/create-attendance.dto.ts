import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AttendanceStatus } from '../entities/attendance.entity.js';

export class CreateAttendanceDto {
  @IsUUID('4')
  @IsNotEmpty()
  employeeId!: string;

  @IsDateString()
  @IsNotEmpty()
  attendanceDate!: string;

  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status!: AttendanceStatus;

  @IsString()
  @IsOptional()
  remarks?: string;
}
