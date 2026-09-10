import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BillingInterval } from '../entities/payment-transaction.entity.js';

export class CreatePaymentOrderDto {
  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @IsEnum(BillingInterval)
  @IsNotEmpty()
  billingInterval!: BillingInterval;
}
