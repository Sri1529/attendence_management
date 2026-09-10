import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { PayrollPeriodStatus } from '../entities/payroll-period.entity.js';

export class PayrollPeriodQueryDto extends PaginationQueryDto {
  @IsEnum(PayrollPeriodStatus)
  @IsOptional()
  status?: PayrollPeriodStatus;
}
