import {
  IsDateString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAdvanceDto {
  @IsNumberString()
  @IsNotEmpty()
  amount!: string;

  @IsDateString()
  @IsNotEmpty()
  advanceDate!: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
