import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
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

import { InstallmentDto } from '../../../core/dto/installment.dto';

import { CreateServiceOrderServiceItemDto } from './create-service-order-service-item.dto';
import { CreateServiceOrderProductItemDto } from './create-service-order-product-item.dto';

export class CreateServiceOrderDto {
  @ApiProperty()
  @IsString()
  partnerId: string;

  @ApiProperty()
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: 'Escopo/descrição do serviço a ser executado.' })
  @IsString({ message: 'Descreva o serviço.' })
  @MaxLength(4000)
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledStart?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledEnd?: Date;

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
      'Tipo de receita (conta do plano de contas) — repassado pro Pedido de Venda na confirmação.',
  })
  @IsString({ message: 'Informe o tipo de receita.' })
  chartOfAccountId?: string;

  @ApiProperty({
    description:
      'Prazo em dias até o vencimento do título gerado depois da confirmação do cliente.',
  })
  @Type(() => Number)
  @IsInt({ message: 'Informe o prazo/vencimento.' })
  @Min(0)
  termDays?: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod, { message: 'Informe a forma de pagamento.' })
  paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installmentsCount?: number;

  @ApiProperty({ required: false, type: [InstallmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments?: InstallmentDto[];

  /** Preenchido só quando a OS nasceu de um Orçamento aprovado (ver tela) — puramente informativo. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  quoteId?: string;

  @ApiProperty({
    type: [CreateServiceOrderServiceItemDto],
    description: 'Serviços realizados — mostrado sempre separado dos produtos.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderServiceItemDto)
  serviceItems: CreateServiceOrderServiceItemDto[];

  @ApiProperty({
    type: [CreateServiceOrderProductItemDto],
    description: 'Produtos/materiais usados na execução.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderProductItemDto)
  productItems: CreateServiceOrderProductItemDto[];
}
