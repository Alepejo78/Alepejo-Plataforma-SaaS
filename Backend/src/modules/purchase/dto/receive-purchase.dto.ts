import { ApiProperty } from '@nestjs/swagger';
import {
  FinancialDocumentType,
  PaymentMethod,
} from '@prisma/client';
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

import { InstallmentDto } from '../../../core/dto/installment.dto';

export class ReceivePurchaseDto {
  @ApiProperty({
    required: false,
    description: 'Número da nota fiscal do fornecedor.',
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
    enum: FinancialDocumentType,
    description:
      'Tipo do documento fiscal. Se não informado mas vier chave de acesso, assume Nota Fiscal.',
  })
  @IsOptional()
  @IsEnum(FinancialDocumentType)
  documentType?: FinancialDocumentType;

  @ApiProperty({
    required: false,
    description: 'Data de emissão da nota fiscal.',
  })
  @IsOptional()
  @IsDateString()
  invoiceIssueDate?: Date;

  @ApiProperty({
    required: false,
    description:
      'Prazo em dias até o vencimento — sobrescreve o informado no lançamento da compra. O vencimento é recalculado a partir da data de emissão da nota.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays?: number;

  @ApiProperty({
    required: false,
    enum: PaymentMethod,
    description:
      'Forma de pagamento — sobrescreve a informada no lançamento da compra.',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    required: false,
    type: [InstallmentDto],
    description:
      'Divide o título gerado em várias parcelas em vez de uma só — quando informado, ignora `termDays` para o vencimento (cada parcela já traz o seu). Somadas, precisam bater com o total da compra.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments?: InstallmentDto[];
}
