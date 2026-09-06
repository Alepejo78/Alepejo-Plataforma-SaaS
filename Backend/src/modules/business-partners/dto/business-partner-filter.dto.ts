import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  BusinessPartnerRole,
  BusinessPartnerStatus,
} from '@prisma/client';

export class BusinessPartnerFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  /** Filtra por papel: ?role=CUSTOMER lista apenas clientes. */
  @IsOptional()
  @IsEnum(BusinessPartnerRole)
  role?: BusinessPartnerRole;

  @IsOptional()
  @IsEnum(BusinessPartnerStatus)
  status?: BusinessPartnerStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number = 10000;

  @IsOptional()
  @IsString()
  orderBy?: string = 'legalName';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';
}
