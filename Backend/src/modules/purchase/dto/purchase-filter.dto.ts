import {
    ApiPropertyOptional,
  } from '@nestjs/swagger';
  
  import {
    IsEnum,
    IsOptional,
    IsString,
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
    @IsString()
    partnerId?: string;
  
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    warehouseId?: string;
  
    @ApiPropertyOptional({
      enum: PurchaseStatusFilter,
    })
    @IsOptional()
    @IsEnum(PurchaseStatusFilter)
    status?: PurchaseStatusFilter;
  }