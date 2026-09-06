import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
  } from 'class-validator';
  import { Transform, Type } from 'class-transformer';
  
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
    @IsString()
    categoryId?: string;
  
    @IsOptional()
    @IsString()
    brandId?: string;
  
    @IsOptional()
    @IsString()
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

    /// Só produtos que de fato controlam estoque (tipo Produto, com
    /// controle de inventário) — usado em telas que precisam de saldo
    /// físico pra fazer sentido, ex.: contagem de inventário. Não
    /// filtra as telas normais de cadastro/venda/compra, onde serviço
    /// é um item válido.
    @IsOptional()
    @Transform(({ value }) => {
      if (value === undefined) return undefined;
      return value === 'true' || value === true;
    })
    @IsBoolean()
    tracksStock?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(10000)
    limit = 10000;
  
    @IsOptional()
    @IsString()
    orderBy = 'description';
  
    @IsOptional()
    @IsString()
    order = 'asc';
  }