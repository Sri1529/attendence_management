import { IsEnum, IsNotEmpty } from 'class-validator';
import { AdjustmentStatus } from '../entities/salary-adjustment.entity.js';

export class UpdateAdjustmentStatusDto {
  @IsEnum(AdjustmentStatus)
  @IsNotEmpty()
  status!: AdjustmentStatus;
}
