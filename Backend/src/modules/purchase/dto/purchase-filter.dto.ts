import {
    ApiPropertyOptional,
  } from '@nestjs/swagger';
  
  import {
    IsEnum,
    IsOptional,
    IsUUID,
  } from 'class-validator';
  
  export enum PurchaseStatusFilter {
    DRAFT = 'DRAFT',
    APPROVED = 'APPROVED',
    RECEIVED = 'RECEIVED',
    CANCELLED = 'CANCELLED',
  }
  
  export class PurchaseFilterDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    supplierId?: string;
  
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    warehouseId?: string;
  
    @ApiPropertyOptional({
      enum: PurchaseStatusFilter,
    })
    @IsOptional()
    @IsEnum(PurchaseStatusFilter)
    status?: PurchaseStatusFilter;
  }