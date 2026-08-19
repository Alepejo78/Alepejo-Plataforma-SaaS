import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  FinancialEntryStatus,
  FinancialEntryType,
} from '@prisma/client';

export class FinancialEntryFilterDto {
  @IsOptional()
  @IsEnum(FinancialEntryType)
  type?: FinancialEntryType;

  @IsOptional()
  @IsEnum(FinancialEntryStatus)
  status?: FinancialEntryStatus;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  /** Vencimento a partir de (inclusive). */
  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  /** Vencimento até (inclusive). */
  @IsOptional()
  @IsDateString()
  dueTo?: string;

  /** "true" traz apenas títulos vencidos e ainda em aberto. */
  @IsOptional()
  @IsBooleanString()
  overdue?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 50;

  @IsOptional()
  @IsIn(['dueDate', 'issueDate', 'amount', 'createdAt'])
  orderBy: 'dueDate' | 'issueDate' | 'amount' | 'createdAt' =
    'dueDate';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}
