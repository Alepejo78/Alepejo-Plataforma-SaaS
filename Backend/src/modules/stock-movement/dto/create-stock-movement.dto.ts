import { ApiProperty } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateStockMovementDto {
  @ApiProperty()
  @IsUUID()
  inventoryId: string;

  @ApiProperty({
    enum: StockMovementType,
  })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({
    example: 10,
  })
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @ApiProperty({
    required: false,
    example: 15.50,
  })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observation?: string;
}