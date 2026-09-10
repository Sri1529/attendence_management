import { IsOptional, IsString, MaxLength, IsEmail, IsEnum } from 'class-validator';
import { AbsenceDeductionMode } from '../entities/company.entity.js';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsEnum(AbsenceDeductionMode)
  absence_deduction_mode?: AbsenceDeductionMode;
}
