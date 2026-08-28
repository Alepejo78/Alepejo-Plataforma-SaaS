import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { CreateInventoryCountDto } from './create-inventory-count.dto';
import { UpdateInventoryCountItemDto } from './update-inventory-count-item.dto';

export class UpdateInventoryCountDto extends PartialType(
  CreateInventoryCountDto,
) {
  @ApiProperty({
    type: [UpdateInventoryCountItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateInventoryCountItemDto)
  items?: UpdateInventoryCountItemDto[];
}
