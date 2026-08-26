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

import { CreatePurchaseItemDto } from '../../purchase/dto/create-purchase-item.dto';
import { InstallmentDto } from '../../../core/dto/installment.dto';
import { InvoicePartnerDto } from './invoice-partner.dto';

/** Importação de nota fiscal criando um Pedido de Compra completo. */
export class ConfirmPurchaseImportDto {
  @ApiProperty({ type: InvoicePartnerDto })
  @ValidateNested()
  @Type(() => InvoicePartnerDto)
  partner: InvoicePartnerDto;

  @ApiProperty()
  @IsString()
  warehouseId: string;

  @ApiProperty()
  @IsString({ message: 'Informe o tipo de despesa.' })
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
      'Divide o título gerado no recebimento em várias parcelas — quando informado, ignora `termDays`.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments?: InstallmentDto[];

  @ApiProperty({ type: [CreatePurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];

  @ApiProperty({
    required: false,
    default: true,
    description:
      'Já confirma o recebimento (entra no estoque e gera o título a pagar) — desmarcado, a compra fica aprovada aguardando recebimento na tela de Recebimento (confere quantidade/bipa os produtos depois).',
  })
  @IsOptional()
  @IsBoolean()
  confirmReceipt?: boolean;
}
