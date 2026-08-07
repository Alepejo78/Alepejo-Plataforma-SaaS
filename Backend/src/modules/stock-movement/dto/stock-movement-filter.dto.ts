import { ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class StockMovementFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inventoryId?: string;

  @ApiPropertyOptional({
    enum: StockMovementType,
  })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}