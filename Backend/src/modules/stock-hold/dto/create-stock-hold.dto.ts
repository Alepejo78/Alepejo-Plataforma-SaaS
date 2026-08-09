import { ApiProperty } from '@nestjs/swagger';
import { StockHoldType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStockHoldDto {
  @ApiProperty()
  @IsString()
  inventoryId: string;

  @ApiProperty({
    enum: StockHoldType,
  })
  @IsEnum(StockHoldType)
  type: StockHoldType;

  @ApiProperty({
    example: 10,
  })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
