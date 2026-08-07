import { ApiProperty } from '@nestjs/swagger';

import {
  IsNumber,
  IsPositive,
  Min,
  IsString,
} from 'class-validator';

export class CreateSaleItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({
    example: 5,
  })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({
    example: 125.90,
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}