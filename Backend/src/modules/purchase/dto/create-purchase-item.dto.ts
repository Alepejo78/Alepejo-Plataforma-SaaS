import {
    ApiProperty,
  } from '@nestjs/swagger';
  
  import {
    IsNumber,
    IsPositive,
    IsString,
    Min,
  } from 'class-validator';
  
  export class CreatePurchaseItemDto {
    @ApiProperty()
    @IsString()
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