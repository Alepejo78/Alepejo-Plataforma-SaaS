import {
  ProductionOrderOrigin,
  ProductionOrderStatus,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ProductionOrderFilterDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(ProductionOrderStatus)
  status?: ProductionOrderStatus;

  @IsOptional()
  @IsEnum(ProductionOrderOrigin)
  origin?: ProductionOrderOrigin;
}
