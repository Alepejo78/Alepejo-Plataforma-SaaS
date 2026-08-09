import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateQuoteItemDto } from './create-quote-item.dto';

export class CreateQuoteDto {
  @ApiProperty()
  @IsString()
  partnerId: string;

  @ApiProperty()
  @IsString()
  warehouseId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  quoteDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  validUntil?: Date;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue?: number = 0;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freightValue?: number = 0;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherExpenses?: number = 0;

  @ApiProperty({ type: [CreateQuoteItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  items: CreateQuoteItemDto[];
}
