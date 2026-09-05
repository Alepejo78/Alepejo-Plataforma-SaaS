import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export type QuotePaymentTiming = 'A_VISTA' | 'A_PRAZO';

export class PublicApproveQuoteDto {
  @ApiProperty({
    enum: ['A_VISTA', 'A_PRAZO'],
    required: false,
    description:
      'Obrigatório só em orçamento de venda — orçamento de serviço não escolhe forma de pagamento aqui (isso é definido na Ordem de Serviço).',
  })
  @IsOptional()
  @IsIn(['A_VISTA', 'A_PRAZO'], {
    message: 'Informe se o pagamento é à vista ou a prazo.',
  })
  paymentTiming?: QuotePaymentTiming;

  @ApiProperty({
    required: false,
    description: 'Quantidade de parcelas escolhida (só quando "a prazo").',
  })
  @IsOptional()
  @IsInt()
  @Min(2)
  installmentsCount?: number;
}
