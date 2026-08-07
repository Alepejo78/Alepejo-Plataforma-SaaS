import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInventoryDto {

  @ApiProperty({
    example: '6a32d83e-96d8-42c2-b61f-4db66d1d12d4',
  })
  @IsString()
  productId: string;

  @ApiProperty({
    example: '1f1a45d5-4c90-45ef-a9f3-8d19ec1bca0f',
  })
  @IsString()
  warehouseId: string;

  @ApiProperty({
    example: 100,
  })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    example: 25.50,
  })
  @IsNumber()
  @Min(0)
  averageCost: number;

  @ApiProperty({
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}