import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
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
    @IsUUID()
    companyId: string;
  
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
    @IsUUID()
    categoryId?: string;
  
    @IsOptional()
    @IsUUID()
    brandId?: string;
  
    @IsUUID()
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