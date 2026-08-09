import { ApiPropertyOptional } from '@nestjs/swagger';
import { StockHoldStatus, StockHoldType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class StockHoldFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inventoryId?: string;

  @ApiPropertyOptional({ enum: StockHoldType })
  @IsOptional()
  @IsEnum(StockHoldType)
  type?: StockHoldType;

  @ApiPropertyOptional({ enum: StockHoldStatus })
  @IsOptional()
  @IsEnum(StockHoldStatus)
  status?: StockHoldStatus;
}
