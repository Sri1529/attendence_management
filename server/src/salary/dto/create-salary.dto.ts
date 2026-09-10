import {
  IsDateString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSalaryDto {
  @IsNumberString()
  @IsNotEmpty()
  basicSalary!: string;

  @IsDateString()
  @IsNotEmpty()
  effectiveFrom!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
