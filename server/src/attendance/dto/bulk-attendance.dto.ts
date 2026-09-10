import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../entities/attendance.entity.js';

export class BulkAttendanceItemDto {
  @IsUUID('4')
  @IsNotEmpty()
  employeeId!: string;

  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status!: AttendanceStatus;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class BulkAttendanceDto {
  @IsDateString()
  @IsNotEmpty()
  attendanceDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceItemDto)
  records!: BulkAttendanceItemDto[];
}
