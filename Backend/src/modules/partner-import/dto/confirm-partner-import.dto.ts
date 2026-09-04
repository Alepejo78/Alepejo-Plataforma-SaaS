import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { PartnerImportRowDto } from './partner-import-row.dto';

export class ConfirmPartnerImportDto {
  @ApiProperty({ type: [PartnerImportRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PartnerImportRowDto)
  rows: PartnerImportRowDto[];
}
