import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SectorFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  limit = 10000;

  @IsOptional()
  @IsIn(['name', 'createdAt'])
  orderBy: 'name' | 'createdAt' = 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}
