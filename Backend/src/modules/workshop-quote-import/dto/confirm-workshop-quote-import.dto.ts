import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { PaymentMethod } from '@prisma/client';

export class WorkshopQuotePartnerDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;
}

export class WorkshopQuoteItemDto {
  @ApiProperty({ enum: ['PART', 'SERVICE'] })
  @IsIn(['PART', 'SERVICE'])
  kind: 'PART' | 'SERVICE';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty()
  @IsString()
  unit: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity: number;

  /// Valor líquido do item (já com desconto aplicado, se houve) — é o
  /// que vira o título financeiro. `grossValue` só informa o preço de
  /// tabela do produto/serviço recém-cadastrado.
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  netValue: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  grossValue: number;
}

/**
 * Confirmação da importação do orçamento de oficina — gera um título
 * a receber por item (peça e serviço nunca dividem o mesmo título,
 * já que `FinancialEntry.productId` é um campo só). Cliente e
 * produto/serviço são cadastrados automaticamente quando não existem
 * ainda (ver `WorkshopQuoteImportService`).
 */
export class ConfirmWorkshopQuoteImportDto {
  @ApiProperty({ type: WorkshopQuotePartnerDto })
  @ValidateNested()
  @Type(() => WorkshopQuotePartnerDto)
  partner: WorkshopQuotePartnerDto;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  documentNumber: string;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installmentsCount: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays: number;

  @ApiProperty({ type: [WorkshopQuoteItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkshopQuoteItemDto)
  items: WorkshopQuoteItemDto[];
}
