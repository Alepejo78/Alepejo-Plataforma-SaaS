import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateInventoryDto {
  @ApiProperty({
    example: 'b84efea8-4d2d-4af9-aed5-f8e43dcdd4fd',
  })
  @IsUUID()
  companyId: string;

  @ApiProperty({
    example: '6a32d83e-96d8-42c2-b61f-4db66d1d12d4',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: '1f1a45d5-4c90-45ef-a9f3-8d19ec1bca0f',
  })
  @IsUUID()
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