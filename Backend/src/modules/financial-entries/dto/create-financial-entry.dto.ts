import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
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

  /// Cliente/fornecedor OU colaborador (folha) — exatamente um dos
  /// dois, nunca os dois nem nenhum (ver CHECK no banco).
  @ValidateIf((dto) => !dto.employeeId)
  @IsString({ message: 'Informe o parceiro ou o colaborador.' })
  partnerId?: string;

  @ValidateIf((dto) => !dto.partnerId)
  @IsString({ message: 'Informe o parceiro ou o colaborador.' })
  employeeId?: string;

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
