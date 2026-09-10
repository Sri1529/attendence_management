import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { PayrollRecordStatus } from '../entities/payroll-record.entity.js';

export class PayrollRecordQueryDto extends PaginationQueryDto {
  @IsUUID('4')
  @IsOptional()
  employeeId?: string;

  @IsEnum(PayrollRecordStatus)
  @IsOptional()
  status?: PayrollRecordStatus;
}
