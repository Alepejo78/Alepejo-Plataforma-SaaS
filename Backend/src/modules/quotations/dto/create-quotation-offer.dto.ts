import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateQuotationOfferItemDto } from './create-quotation-offer-item.dto';

export class CreateQuotationOfferDto {
  @ApiProperty()
  @IsString()
  partnerId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  termDays?: number;

  @ApiProperty({ required: false, enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ type: [CreateQuotationOfferItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  items: CreateQuotationOfferItemDto[];
}
