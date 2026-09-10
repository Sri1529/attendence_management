import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentTransactionStatus } from '../entities/payment-transaction.entity.js';

export class PaymentQueryDto {
  @IsEnum(PaymentTransactionStatus)
  @IsOptional()
  status?: PaymentTransactionStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;
}
