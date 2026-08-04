import { ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsEnum,
  IsOptional,
  IsUUID,
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
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({
    enum: SaleStatusFilter,
  })
  @IsOptional()
  @IsEnum(SaleStatusFilter)
  status?: SaleStatusFilter;
}