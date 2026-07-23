import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { PAGINATION } from '../constants/pagination.constants';

export class PaginationDto {
  @ApiPropertyOptional({
    default: PAGINATION.DEFAULT_PAGE,
    minimum: PAGINATION.MIN_PAGE,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(PAGINATION.MIN_PAGE)
  page: number = PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: PAGINATION.DEFAULT_LIMIT,
    minimum: PAGINATION.MIN_LIMIT,
    maximum: PAGINATION.MAX_LIMIT,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(PAGINATION.MIN_LIMIT)
  @Max(PAGINATION.MAX_LIMIT)
  limit: number = PAGINATION.DEFAULT_LIMIT;
}