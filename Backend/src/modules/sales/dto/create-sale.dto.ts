import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateSaleItemDto } from './create-sale-item.dto';

export class CreateSaleDto {
  @ApiProperty()
  @IsUUID()
  clientId: string;

  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsDateString()
  saleDate?: Date;

  @ApiProperty({
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;

  @ApiProperty({
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue?: number = 0;

  @ApiProperty({
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freightValue?: number = 0;

  @ApiProperty({
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherExpenses?: number = 0;

  @ApiProperty({
    type: [CreateSaleItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  items: CreateSaleItemDto[];
}
