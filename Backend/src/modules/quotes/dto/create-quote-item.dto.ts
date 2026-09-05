import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

import { QuoteItemKind } from '@prisma/client';

export class CreateQuoteItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({
    enum: QuoteItemKind,
    required: false,
    default: QuoteItemKind.PRODUCT,
    description:
      'Só relevante em orçamento de serviço (Quote.purpose SERVICE) — separa "Serviços Realizados" de "Produtos e Materiais Usados".',
  })
  @IsOptional()
  @IsEnum(QuoteItemKind)
  itemKind?: QuoteItemKind;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  unitPrice: number;
}
