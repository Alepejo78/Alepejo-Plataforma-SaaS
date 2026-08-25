import {
    ApiProperty,
  } from '@nestjs/swagger';
  
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

  import { PaymentMethod } from '@prisma/client';

  import { CreatePurchaseItemDto } from './create-purchase-item.dto';
  
  export class CreatePurchaseDto {
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
    purchaseDate?: Date;
  
    @ApiProperty({
      required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    observation?: string;

    @ApiProperty({
      required: false,
      description:
        'Tipo de despesa (conta do plano de contas). Vai junto pro título gerado no recebimento.',
    })
    @IsOptional()
    @IsString()
    chartOfAccountId?: string;

    @ApiProperty({
      required: false,
      default: 0,
      description: 'Prazo em dias para o vencimento do título gerado no recebimento.',
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
      default: 1,
      description:
        'Em quantos títulos o vencimento se divide no recebimento (30/60/90... = termDays × 1/2/3). Se vier de um pedido de compra e não for informado, usa o do pedido.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    installmentsCount?: number;

    @ApiProperty({
      required: false,
      description:
        'Pedido de compra de origem — a compra nasce com os dados dele e ele passa para CONVERTED.',
    })
    @IsOptional()
    @IsString()
    purchaseOrderId?: string;

    @ApiProperty({
      required: false,
      description:
        'Número da nota fiscal do fornecedor — quando a compra já nasce com a nota em mãos (ex.: importação de XML) mas o recebimento físico fica pra depois.',
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
      description: 'Data de emissão da nota fiscal.',
    })
    @IsOptional()
    @IsDateString()
    invoiceIssueDate?: Date;

    @ApiProperty({
      type: [CreatePurchaseItemDto],
    })
    @IsArray()
    @ArrayMinSize(1)
    items: CreatePurchaseItemDto[];
  }