import { ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export enum SaleStatusFilter {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  INVOICED = 'INVOICED',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
}

export class SaleFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({
    enum: SaleStatusFilter,
  })
  @IsOptional()
  @IsEnum(SaleStatusFilter)
  status?: SaleStatusFilter;
}