import { IsEnum, IsNotEmpty } from 'class-validator';
import { AttendanceStatus } from '../entities/attendance.entity.js';

export class UpdateAttendanceStatusDto {
  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status!: AttendanceStatus;
}
