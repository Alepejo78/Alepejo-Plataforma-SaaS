import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chartOfAccountId?: string;

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

  @ApiProperty({ required: false, enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

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
}
