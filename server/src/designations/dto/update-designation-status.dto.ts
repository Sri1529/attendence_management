import { IsEnum, IsNotEmpty } from 'class-validator';
import { DesignationStatus } from '../entities/designation.entity.js';

export class UpdateDesignationStatusDto {
  @IsEnum(DesignationStatus)
  @IsNotEmpty()
  status!: DesignationStatus;
}
