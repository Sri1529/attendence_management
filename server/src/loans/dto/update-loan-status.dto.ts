import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LoanStatus } from '../entities/employee-loan.entity.js';

export class UpdateLoanStatusDto {
  @IsEnum(LoanStatus)
  @IsNotEmpty()
  status!: LoanStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
