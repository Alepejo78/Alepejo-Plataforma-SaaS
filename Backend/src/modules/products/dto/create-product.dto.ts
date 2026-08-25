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

    @IsOptional()
    @IsString()
    @MaxLength(50)
    reference?: string;

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

    @IsOptional()
    @IsString()
    chartOfAccountId?: string;

    @IsOptional()
    @IsString()
    saleChartOfAccountId?: string;

    @IsString()
    unitId: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    salePrice: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    minimumStock?: number;

    /// Lote mínimo por ordem de produção — sobrepõe o padrão da
    /// empresa (ProductionSettings.minBatchSize) quando preenchido.
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    minProductionBatch?: number;

    /// Logística/frete — não interfere em estoque nem em custo.
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    weightKg?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 4 })
    @Min(0)
    cubageM3?: number;

    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;
  
    @IsOptional()
    @IsBoolean()
    active?: boolean;
  }