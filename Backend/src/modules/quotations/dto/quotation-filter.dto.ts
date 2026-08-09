import { QuotationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QuotationFilterDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;
}
