import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class InventoryFilterDto {

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @ApiPropertyOptional({
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn([
    'createdAt',
    'updatedAt',
    'quantity',
    'averageCost',
  ])
  orderBy:
    | 'createdAt'
    | 'updatedAt'
    | 'quantity'
    | 'averageCost' = 'createdAt';

  @ApiPropertyOptional({
    default: 'asc',
  })
  @IsOptional()
  @Transform(({ value }) =>
    String(value).toLowerCase(),
  )
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}