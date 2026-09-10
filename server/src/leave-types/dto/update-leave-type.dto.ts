import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateLeaveTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_paid?: boolean;
}
