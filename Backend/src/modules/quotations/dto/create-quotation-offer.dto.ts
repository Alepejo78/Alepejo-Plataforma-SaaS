import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateQuotationOfferItemDto } from './create-quotation-offer-item.dto';

export class CreateQuotationOfferDto {
  @ApiProperty()
  @IsString()
  partnerId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays?: number;

  @ApiProperty({ required: false, enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    required: false,
    default: 1,
    description:
      'Em quantos títulos o vencimento se divide (30/60/90... = termDays × 1/2/3). Vai junto pro Pedido de Compra se esta proposta vencer.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installmentsCount?: number;

  @ApiProperty({ type: [CreateQuotationOfferItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  items: CreateQuotationOfferItemDto[];
}
