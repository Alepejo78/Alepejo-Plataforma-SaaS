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

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

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
