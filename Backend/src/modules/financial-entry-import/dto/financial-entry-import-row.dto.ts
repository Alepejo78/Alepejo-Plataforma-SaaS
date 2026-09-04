import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  FinancialDocumentType,
  FinancialEntryStatus,
  FinancialEntryType,
  PaymentMethod,
} from '@prisma/client';

/** Uma linha já validada no `/parse`, pronta pra gravar no `/confirm`. */
export class FinancialEntryImportRowDto {
  @ApiProperty({ enum: ['create', 'update'] })
  @IsIn(['create', 'update'])
  action: 'create' | 'update';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  existingId?: string;

  @ApiProperty({ enum: FinancialEntryType })
  @IsEnum(FinancialEntryType)
  type: FinancialEntryType;

  @ApiProperty()
  @IsString()
  partnerId: string;

  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsString()
  chartOfAccountId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ enum: FinancialDocumentType, required: false })
  @IsOptional()
  @IsEnum(FinancialDocumentType)
  documentType?: FinancialDocumentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;

  /** Título antigo já baixado/cancelado noutro sistema — sem isso, todo título importado nasce em aberto. */
  @ApiProperty({ enum: FinancialEntryStatus, required: false })
  @IsOptional()
  @IsEnum(FinancialEntryStatus)
  status?: FinancialEntryStatus;

  /** Só usado quando `status` é PAID — se omitido, cai no vencimento. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;
}
