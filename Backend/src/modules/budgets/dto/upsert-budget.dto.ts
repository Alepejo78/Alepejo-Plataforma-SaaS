import { BudgetType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class UpsertBudgetDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsEnum(BudgetType)
  type: BudgetType;

  @IsNumber()
  @Min(0)
  plannedAmount: number;
}
