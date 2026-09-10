import { IsNotEmpty, IsString } from 'class-validator';

export class ReversePayrollCorrectionDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
