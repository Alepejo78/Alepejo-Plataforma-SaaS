import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const BILLING_CYCLES = ['MONTHLY', 'YEARLY'] as const;

export type BillingCycleValue = (typeof BILLING_CYCLES)[number];

export class ChangeCycleDto {
  @ApiProperty({
    enum: BILLING_CYCLES,
    description:
      'Ciclo desejado. YEARLY cobra na hora; MONTHLY passa a valer só no fim do período já pago.',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(BILLING_CYCLES)
  billingCycle: BillingCycleValue;
}
