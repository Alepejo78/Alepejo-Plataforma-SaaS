import {
    ApiProperty,
  } from '@nestjs/swagger';
  
  import {
    IsNumber,
    IsPositive,
    IsUUID,
    Min,
  } from 'class-validator';
  
  export class CreatePurchaseItemDto {
    @ApiProperty()
    @IsUUID()
    productId: string;
  
    @ApiProperty({
      example: 10,
    })
    @IsNumber()
    @IsPositive()
    quantity: number;
  
    @ApiProperty({
      example: 15.90,
    })
    @IsNumber()
    @Min(0)
    unitPrice: number;
  }