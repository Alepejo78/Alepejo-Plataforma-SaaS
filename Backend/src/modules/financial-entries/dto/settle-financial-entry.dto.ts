import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

import { PaymentMethod } from '@prisma/client';

/** Baixa do título: registra o pagamento/recebimento. */
export class SettleFinancialEntryDto {
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  // Obrigatório: é a forma usada de verdade nessa baixa — se ficasse
  // opcional, quem não preenchesse manteria a forma antiga (herdada
  // do lançamento/recebimento) gravada como se fosse a real, o que
  // já bagunçou o gráfico de forma de pagamento do fluxo de caixa.
  @IsEnum(PaymentMethod, {
    message: 'Informe a forma de pagamento usada na baixa.',
  })
  paymentMethod: PaymentMethod;

  /** Se omitido, baixa o valor total em aberto. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  paidAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;
}
