import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class UpsertProductionSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  minBatchSize?: number;

  @ApiProperty({
    required: false,
    description: 'Dias de produção padrão usados quando uma ordem nasce sozinha.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  defaultProductionDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  autoGenerateOnSalesOrder?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  autoGenerateOnLowStock?: boolean;
}
