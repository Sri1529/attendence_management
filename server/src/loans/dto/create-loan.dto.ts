import {
  IsDateString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLoanDto {
  @IsUUID('4')
  @IsNotEmpty()
  employeeId!: string;

  @IsNumberString()
  @IsNotEmpty()
  principalAmount!: string;

  @IsDateString()
  @IsNotEmpty()
  loanDate!: string;

  @IsDateString()
  @IsOptional()
  startRepaymentDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
