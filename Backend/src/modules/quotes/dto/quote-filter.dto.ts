import { QuotePurpose, QuoteStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QuoteFilterDto {
  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @IsEnum(QuotePurpose)
  purpose?: QuotePurpose;
}
