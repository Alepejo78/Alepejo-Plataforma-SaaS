import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { FinancialDocumentType, PaymentMethod } from '@prisma/client';

import { InstallmentDto } from '../../../core/dto/installment.dto';
import { InvoicePartnerDto } from './invoice-partner.dto';

/**
 * Importação de nota fiscal lançando direto em Contas a
 * Pagar/Receber, sem Pedido de Compra/Venda nem estoque — pra
 * despesa/receita de serviço (água, luz, telefone, internet...).
 * Usado tanto do lado de compra (PAYABLE) quanto de venda (RECEIVABLE)
 * — o controller decide o `type` conforme a rota chamada.
 */
export class ConfirmExpenseImportDto {
  @ApiProperty({ type: InvoicePartnerDto })
  @ValidateNested()
  @Type(() => InvoicePartnerDto)
  partner: InvoicePartnerDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chartOfAccountId?: string;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentKey?: string;

  @ApiProperty({ required: false, enum: FinancialDocumentType })
  @IsOptional()
  @IsEnum(FinancialDocumentType)
  documentType?: FinancialDocumentType;

  @ApiProperty({ required: false, enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;

  @ApiProperty({ type: [InstallmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments: InstallmentDto[];
}
