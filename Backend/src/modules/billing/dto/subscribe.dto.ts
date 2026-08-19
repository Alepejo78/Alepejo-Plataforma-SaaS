import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const BILLING_TYPES = [
  'PIX',
  'BOLETO',
  'CREDIT_CARD',
  'UNDEFINED',
] as const;

export type BillingTypeValue = (typeof BILLING_TYPES)[number];

export class SubscribeDto {
  @ApiProperty({
    enum: BILLING_TYPES,
    description:
      'UNDEFINED deixa o cliente escolher a forma de pagamento na fatura do Asaas.',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(BILLING_TYPES)
  billingType: BillingTypeValue;
}
