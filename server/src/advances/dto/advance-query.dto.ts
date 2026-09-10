import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { AdvanceStatus } from '../entities/employee-advance.entity.js';

export class AdvanceQueryDto extends PaginationQueryDto {
  @IsEnum(AdvanceStatus)
  @IsOptional()
  status?: AdvanceStatus;
}
