import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertProductionSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  minBatchSize?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  autoGenerateOnSalesOrder?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  autoGenerateOnLowStock?: boolean;
}
