import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class SalaryQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  date?: string;
}
