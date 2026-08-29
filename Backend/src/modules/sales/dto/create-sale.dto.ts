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
    description:
      'Tipo de receita (conta do plano de contas). Vai junto pro título gerado na aprovação.',
  })
  @IsString({ message: 'Informe o tipo de receita.' })
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
    description: 'Prazo em dias para o vencimento do título gerado na aprovação.',
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
      'Em quantos títulos o vencimento se divide na aprovação (30/60/90... = termDays × 1/2/3). Se vier de um pedido de venda e não for informado, usa o do pedido.',
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
      'Parcelas planejadas na hora da venda (data/valor escolhidos na mão) — quando informado, tem prioridade sobre installmentsCount/termDays na aprovação (que ainda pode ajustar antes de confirmar). Se vier de um pedido de venda e não for informado, usa as parcelas planejadas nele. Somadas, precisam bater com o total da venda.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments?: InstallmentDto[];

  @ApiProperty({
    required: false,
    description: 'Número da nota fiscal da venda.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;

  @ApiProperty({
    required: false,
    description: 'Chave de acesso da NF-e (44 dígitos).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceKey?: string;

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
