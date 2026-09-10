import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReopenPayrollPeriodDto {
  @IsNotEmpty({ message: 'Reason for reopening is mandatory' })
  @IsString({ message: 'Reason must be a valid text string' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason!: string;
}
