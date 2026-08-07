import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    MaxLength,
    Min,
  } from 'class-validator';
  
  import {
    InventoryControl,
    ProductStatus,
    ProductType,
  } from '@prisma/client';
  
  export class CreateProductDto {
  
    @IsString()
    @Length(1, 30)
    code: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(30)
    barcode?: string;
  
    @IsString()
    @Length(3, 200)
    description: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(255)
    complementaryDescription?: string;
  
    @IsEnum(ProductType)
    type: ProductType;
  
    @IsEnum(InventoryControl)
    inventoryControl: InventoryControl;
  
    @IsOptional()
    @IsString()
    categoryId?: string;
  
    @IsOptional()
    @IsString()
    brandId?: string;
  
    @IsString()
    unitId: string;
  
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    cost: number;
  
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    salePrice: number;
  
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    minimumStock?: number;
  
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    currentStock?: number;
  
    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;
  
    @IsOptional()
    @IsBoolean()
    active?: boolean;
  }