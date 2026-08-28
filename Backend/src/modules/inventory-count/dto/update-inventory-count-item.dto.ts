import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateInventoryCountItemDto {
  @ApiProperty()
  @IsString()
  productId: string;
}
