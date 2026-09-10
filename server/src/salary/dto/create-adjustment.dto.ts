import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { AdjustmentType } from '../entities/salary-adjustment.entity.js';

export class CreateAdjustmentDto {
  @IsEnum(AdjustmentType)
  @IsNotEmpty()
  adjustmentType!: AdjustmentType;

  @IsNumberString()
  @IsNotEmpty()
  amount!: string;

  @IsDateString()
  @IsNotEmpty()
  adjustmentDate!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
