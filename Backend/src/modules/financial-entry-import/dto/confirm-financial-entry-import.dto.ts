import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { FinancialEntryImportRowDto } from './financial-entry-import-row.dto';

export class ConfirmFinancialEntryImportDto {
  @ApiProperty({ type: [FinancialEntryImportRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FinancialEntryImportRowDto)
  rows: FinancialEntryImportRowDto[];
}
