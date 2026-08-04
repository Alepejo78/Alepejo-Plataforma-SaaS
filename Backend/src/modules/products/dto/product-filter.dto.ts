import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  import {
    InventoryControl,
    ProductStatus,
    ProductType,
  } from '@prisma/client';
  
  export class ProductFilterDto {
  
    @IsOptional()
    @IsString()
    search?: string;
  
    @IsOptional()
    @IsString()
    code?: string;
  
    @IsOptional()
    @IsString()
    barcode?: string;
  
    @IsOptional()
    @IsUUID()
    categoryId?: string;
  
    @IsOptional()
    @IsUUID()
    brandId?: string;
  
    @IsOptional()
    @IsUUID()
    unitId?: string;
  
    @IsOptional()
    @IsEnum(ProductType)
    type?: ProductType;
  
    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;
  
    @IsOptional()
    @IsEnum(InventoryControl)
    inventoryControl?: InventoryControl;
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 20;
  
    @IsOptional()
    @IsString()
    orderBy = 'description';
  
    @IsOptional()
    @IsString()
    order = 'asc';
  }