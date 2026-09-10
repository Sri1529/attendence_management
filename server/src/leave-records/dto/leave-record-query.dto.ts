import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { LeaveStatus } from '../entities/leave-record.entity.js';

export class LeaveRecordQueryDto extends PaginationQueryDto {
  @IsUUID('4')
  @IsOptional()
  employeeId?: string;

  @IsEnum(LeaveStatus)
  @IsOptional()
  status?: LeaveStatus;
}
