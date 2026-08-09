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
      description:
        'Pedido de compra de origem — a compra nasce com os dados dele e ele passa para CONVERTED.',
    })
    @IsOptional()
    @IsString()
    purchaseOrderId?: string;

    @ApiProperty({
      type: [CreatePurchaseItemDto],
    })
    @IsArray()
    @ArrayMinSize(1)
    items: CreatePurchaseItemDto[];
  }