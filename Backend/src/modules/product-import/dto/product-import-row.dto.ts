import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  InventoryControl,
  ProductStatus,
  ProductType,
} from '@prisma/client';

/** Uma linha já validada no `/parse`, pronta pra gravar no `/confirm`. */
export class ProductImportRowDto {
  @ApiProperty({ enum: ['create', 'update'] })
  @IsIn(['create', 'update'])
  action: 'create' | 'update';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  existingId?: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiProperty({ enum: InventoryControl })
  @IsEnum(InventoryControl)
  inventoryControl: InventoryControl;

  @ApiProperty()
  @IsString()
  unitId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  complementaryDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chartOfAccountId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  saleChartOfAccountId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumStock?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cubageM3?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minProductionBatch?: number;

  @ApiProperty({ enum: ProductStatus, required: false })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
