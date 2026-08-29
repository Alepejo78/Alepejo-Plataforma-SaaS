import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { PaymentMethod } from '@prisma/client';

import { InstallmentDto } from '../../../core/dto/installment.dto';

import { CreateQuoteItemDto } from './create-quote-item.dto';

export class CreateQuoteDto {
  @ApiProperty()
  @IsString()
  partnerId: string;

  @ApiProperty()
  @IsString()
  warehouseId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  quoteDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  validUntil?: Date;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue?: number = 0;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freightValue?: number = 0;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherExpenses?: number = 0;

  @ApiProperty({
    description:
      'Tipo de receita (conta do plano de contas). Vai junto pro Pedido de Venda e pra Venda gerados na aprovação.',
  })
  @IsString({ message: 'Informe o tipo de receita.' })
  chartOfAccountId?: string;

  @ApiProperty({
    description: 'Prazo em dias para o vencimento do título gerado na venda.',
  })
  @Type(() => Number)
  @IsInt({ message: 'Informe o prazo/vencimento.' })
  @Min(0)
  termDays?: number;

  @ApiProperty({
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod, { message: 'Informe a forma de pagamento.' })
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    required: false,
    default: 1,
    description:
      'Em quantos títulos o vencimento se divide (30/60/90... = termDays × 1/2/3).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installmentsCount?: number;

  @ApiProperty({
    required: false,
    type: [InstallmentDto],
    description:
      'Parcelas planejadas na hora do orçamento (data/valor escolhidos na mão) — quando informado, tem prioridade sobre installmentsCount/termDays no Pedido de Venda e na Venda gerados (que ainda podem ajustar antes de confirmar). Somadas, precisam bater com o total do orçamento.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments?: InstallmentDto[];

  @ApiProperty({ type: [CreateQuoteItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  items: CreateQuoteItemDto[];
}
