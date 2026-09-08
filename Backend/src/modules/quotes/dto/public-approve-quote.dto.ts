import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';

import { PaymentMethod } from '@prisma/client';

/** Formas de pagamento que o cliente pode escolher no link público. */
export const PUBLIC_QUOTE_PAYMENT_METHODS = [
  PaymentMethod.PIX,
  PaymentMethod.BOLETO,
  PaymentMethod.DEBITO,
  PaymentMethod.CREDITO,
] as const;

export class PublicApproveQuoteDto {
  @ApiProperty({
    enum: PUBLIC_QUOTE_PAYMENT_METHODS,
    description:
      'Forma de pagamento escolhida na aprovação — igual em orçamento de venda ou de serviço.',
  })
  @IsEnum(PaymentMethod, { message: 'Informe a forma de pagamento.' })
  @IsIn(PUBLIC_QUOTE_PAYMENT_METHODS, {
    message: 'Forma de pagamento não disponível para aprovação pelo cliente.',
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    required: false,
    description:
      'Quantidade de parcelas (só quando a forma de pagamento permite parcelar — boleto ou cartão de crédito).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  installmentsCount?: number;
}
