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
} from 'class-validator';
import { Type } from 'class-transformer';

import { PaymentMethod } from '@prisma/client';

import { CreateSaleItemDto } from './create-sale-item.dto';

export class CreateSaleDto {
  @ApiProperty()
  @IsString()
  partnerId: string;

  @ApiProperty()
  @IsString()
  warehouseId: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsDateString()
  saleDate?: Date;

  @ApiProperty({
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;

  @ApiProperty({
    required: false,
    description:
      'Tipo de receita (conta do plano de contas). Vai junto pro título gerado na aprovação.',
  })
  @IsOptional()
  @IsString()
  chartOfAccountId?: string;

  @ApiProperty({
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue?: number = 0;

  @ApiProperty({
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freightValue?: number = 0;

  @ApiProperty({
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherExpenses?: number = 0;

  @ApiProperty({
    required: false,
    default: 0,
    description: 'Prazo em dias para o vencimento do título gerado na aprovação.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays?: number;

  @ApiProperty({
    required: false,
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    required: false,
    description:
      'Orçamento de origem — a venda nasce com os dados dele e ele passa para CONVERTED.',
  })
  @IsOptional()
  @IsString()
  quoteId?: string;

  @ApiProperty({
    required: false,
    description:
      'Pedido de venda de origem — a venda nasce com os dados dele e ele passa para CONVERTED.',
  })
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @ApiProperty({
    type: [CreateSaleItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  items: CreateSaleItemDto[];
}
