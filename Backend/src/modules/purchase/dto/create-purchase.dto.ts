import {
    ApiProperty,
  } from '@nestjs/swagger';
  
  import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsOptional,
    IsString,
    MaxLength,
  } from 'class-validator';
  
  import { CreatePurchaseItemDto } from './create-purchase-item.dto';
  
  export class CreatePurchaseDto {
    @ApiProperty()
    @IsString()
    partnerId: string;
  
    @ApiProperty()
    @IsString()
    warehouseId: string;
  
    @ApiProperty({
      required: false,
    })
    @IsOptional()
    @IsDateString()
    purchaseDate?: Date;
  
    @ApiProperty({
      required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    observation?: string;
  
    @ApiProperty({
      type: [CreatePurchaseItemDto],
    })
    @IsArray()
    @ArrayMinSize(1)
    items: CreatePurchaseItemDto[];
  }