import {
  IsDateString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRepaymentDto {
  @IsNumberString()
  @IsNotEmpty()
  amount!: string;

  @IsDateString()
  @IsNotEmpty()
  repaymentDate!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
