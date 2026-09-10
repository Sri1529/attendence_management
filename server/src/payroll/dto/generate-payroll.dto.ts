import {
  IsArray,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdvanceDeductionInputDto {
  @IsUUID('4')
  @IsNotEmpty()
  advanceId!: string;

  @IsNumberString()
  @IsNotEmpty()
  amount!: string;
}

export class ManualAbsenceDeductionInputDto {
  @IsUUID('4')
  @IsNotEmpty()
  employeeId!: string;

  @IsNumberString()
  @IsNotEmpty()
  amount!: string;
}

export class GeneratePayrollDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AdvanceDeductionInputDto)
  advanceDeductions?: AdvanceDeductionInputDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ManualAbsenceDeductionInputDto)
  manualAbsenceDeductions?: ManualAbsenceDeductionInputDto[];
}
