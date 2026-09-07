import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { SurchargeType } from '@prisma/client';

export class UpsertPaymentMethodSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  asaasEnabled?: boolean;

  /** Só grava/sobrescreve quando vier preenchida — tela nunca manda a chave de volta. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asaasApiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  asaasSandbox?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultBankAccountId?: string;

  @ApiPropertyOptional({ enum: SurchargeType })
  @IsOptional()
  @IsEnum(SurchargeType)
  boletoSurchargeType?: SurchargeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  boletoSurchargeValue?: number;

  @ApiPropertyOptional({ enum: SurchargeType })
  @IsOptional()
  @IsEnum(SurchargeType)
  transferSurchargeType?: SurchargeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  transferSurchargeValue?: number;

  @ApiPropertyOptional({ enum: SurchargeType })
  @IsOptional()
  @IsEnum(SurchargeType)
  pixSurchargeType?: SurchargeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  pixSurchargeValue?: number;

  @ApiPropertyOptional({ enum: SurchargeType })
  @IsOptional()
  @IsEnum(SurchargeType)
  cardSurchargeType?: SurchargeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cardSurchargeValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  cardMaxInstallments?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  cardInterestFreeInstallments?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cardInterestRatePerInstallment?: number;
}
