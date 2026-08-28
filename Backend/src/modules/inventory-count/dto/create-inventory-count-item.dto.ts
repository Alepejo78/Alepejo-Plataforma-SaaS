import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateInventoryCountItemDto {
  @ApiProperty()
  @IsString()
  productId: string;
}
