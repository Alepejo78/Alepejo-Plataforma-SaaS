import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  partnerId: string;

  @ApiProperty()
  @IsString()
  warehouseId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  orderDate?: Date;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;

  @ApiProperty({
    required: false,
    description:
      'Cotação de origem — quando o pedido nasce da proposta vencedora de uma cotação.',
  })
  @IsOptional()
  @IsString()
  quotationId?: string;

  @ApiProperty({
    required: false,
    description: 'Proposta vencedora de origem, dentro da cotação.',
  })
  @IsOptional()
  @IsString()
  quotationOfferId?: string;

  @ApiProperty({ type: [CreatePurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  items: CreatePurchaseOrderItemDto[];
}
