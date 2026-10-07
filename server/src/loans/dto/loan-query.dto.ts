import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoanStatus } from '../entities/employee-loan.entity.js';

export class LoanQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @IsUUID('4')
  @IsOptional()
  employeeId?: string;

  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;

  @IsString()
  @IsOptional()
  search?: string;
}
