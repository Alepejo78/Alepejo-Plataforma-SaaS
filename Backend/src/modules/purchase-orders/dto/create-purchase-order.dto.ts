import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  partnerId: string;

  @ApiProperty()
  @IsString()
  warehouseId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  orderDate?: Date;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;

  @ApiProperty({
    required: false,
    description:
      'Cotação de origem — quando o pedido nasce da proposta vencedora de uma cotação.',
  })
  @IsOptional()
  @IsString()
  quotationId?: string;

  @ApiProperty({
    required: false,
    description: 'Proposta vencedora de origem, dentro da cotação.',
  })
  @IsOptional()
  @IsString()
  quotationOfferId?: string;

  @ApiProperty({
    required: false,
    description:
      'Prazo em dias até o vencimento do título gerado na conversão em compra — quando o pedido nasce sem cotação, ou pra sobrescrever o da proposta vencedora.',
  })
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
      'Em quantos títulos o vencimento se divide (30/60/90... = termDays × 1/2/3).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installmentsCount?: number;

  @ApiProperty({ type: [CreatePurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  items: CreatePurchaseOrderItemDto[];
}
