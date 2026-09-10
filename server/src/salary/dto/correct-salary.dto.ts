import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CorrectSalaryDto {
  @IsNumberString()
  @IsOptional()
  basicSalary?: string;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
