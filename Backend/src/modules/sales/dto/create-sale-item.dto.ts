import { ApiProperty } from '@nestjs/swagger';

import {
  IsNumber,
  IsPositive,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateSaleItemDto {
  @ApiProperty()
  @IsUUID()
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