import { IsEnum, IsNotEmpty } from 'class-validator';
import { AdvanceStatus } from '../entities/employee-advance.entity.js';

export class UpdateAdvanceStatusDto {
  @IsEnum(AdvanceStatus)
  @IsNotEmpty()
  status!: AdvanceStatus;
}
