import {
    ApiProperty,
  } from '@nestjs/swagger';
  
  import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
  } from 'class-validator';
  
  import { CreatePurchaseItemDto } from './create-purchase-item.dto';
  
  export class CreatePurchaseDto {
    @ApiProperty()
    @IsUUID()
    supplierId: string;
  
    @ApiProperty()
    @IsUUID()
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