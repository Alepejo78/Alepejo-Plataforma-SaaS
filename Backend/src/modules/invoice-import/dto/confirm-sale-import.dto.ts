import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { PaymentMethod } from '@prisma/client';

import { CreateSaleItemDto } from '../../sales/dto/create-sale-item.dto';
import { InstallmentDto } from '../../../core/dto/installment.dto';
import { InvoicePartnerDto } from './invoice-partner.dto';

/** Importação de nota fiscal criando uma Venda completa. */
export class ConfirmSaleImportDto {
  @ApiProperty({ type: InvoicePartnerDto })
  @ValidateNested()
  @Type(() => InvoicePartnerDto)
  partner: InvoicePartnerDto;

  @ApiProperty()
  @IsString()
  warehouseId: string;

  @ApiProperty({
    required: false,
    description:
      'Pedido de venda de origem — quando informado, a venda nasce vinculada a ele e ele passa para CONVERTED.',
  })
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @ApiProperty()
  @IsString({ message: 'Informe o tipo de receita.' })
  chartOfAccountId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  invoiceIssueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays?: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod, { message: 'Informe a forma de pagamento.' })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    required: false,
    type: [InstallmentDto],
    description:
      'Divide o título gerado na aprovação em várias parcelas — quando informado, ignora `termDays`.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments?: InstallmentDto[];

  @ApiProperty({ type: [CreateSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @ApiProperty({
    required: false,
    description:
      'true quando o usuário confirmou a importação apesar de valor/vencimento/CNPJ divergirem do pedido vinculado — nesse caso a venda nasce em rascunho (não aprova sozinha), esperando alguém com a permissão de aprovar dar o aval.',
  })
  @IsOptional()
  @IsBoolean()
  auditOverridden?: boolean;
}
