import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  FinancialDocumentType,
  FinancialEntryType,
  PaymentMethod,
} from '@prisma/client';

export class CreateFinancialEntryDto {
  @IsEnum(FinancialEntryType)
  type: FinancialEntryType;

  @IsString()
  @IsNotEmpty()
  partnerId: string;

  @IsOptional()
  @IsString()
  chartOfAccountId?: string;

  @IsDateString()
  issueDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays?: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @IsOptional()
  @IsEnum(FinancialDocumentType)
  documentType?: FinancialDocumentType;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;
}
