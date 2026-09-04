import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { ProductImportRowDto } from './product-import-row.dto';

export class ConfirmProductImportDto {
  @ApiProperty({ type: [ProductImportRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductImportRowDto)
  rows: ProductImportRowDto[];
}
