import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class CreatePayrollPeriodDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsNotEmpty()
  periodYear!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsNotEmpty()
  periodMonth!: number;
}
