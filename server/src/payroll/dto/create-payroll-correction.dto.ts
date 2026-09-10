import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';
import { PayrollCorrectionType } from '../entities/payroll-correction.entity.js';

export class CreatePayrollCorrectionDto {
  @IsEnum(PayrollCorrectionType, {
    message: 'type must be a valid PayrollCorrectionType enum value',
  })
  @IsNotEmpty()
  type!: PayrollCorrectionType;

  @IsString()
  @IsNotEmpty()
  @Matches(/^-?\d+(\.\d{1,2})?$/, {
    message: 'amount must be a valid numeric monetary string format (e.g. 1000.00 or -500.00)',
  })
  amount!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
