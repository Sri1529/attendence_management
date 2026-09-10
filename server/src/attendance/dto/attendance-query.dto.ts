import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { AttendanceStatus } from '../entities/attendance.entity.js';

export class AttendanceQueryDto extends PaginationQueryDto {
  @IsUUID('4')
  @IsOptional()
  employeeId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;
}
