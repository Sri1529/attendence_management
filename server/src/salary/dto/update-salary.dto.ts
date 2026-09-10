import { IsOptional, IsString } from 'class-validator';

export class UpdateSalaryDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
