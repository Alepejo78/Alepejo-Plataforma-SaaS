import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UnitOfMeasureFilterDto {

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
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
    default: 'description',
  })
  @IsOptional()
  @IsIn([
    'code',
    'description',
    'createdAt',
    'updatedAt',
  ])
  orderBy:
    | 'code'
    | 'description'
    | 'createdAt'
    | 'updatedAt' = 'description';

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