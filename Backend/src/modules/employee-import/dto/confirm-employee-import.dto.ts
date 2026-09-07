import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { EmployeeImportRowDto } from './employee-import-row.dto';

export class ConfirmEmployeeImportDto {
  @ApiProperty({ type: [EmployeeImportRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EmployeeImportRowDto)
  rows: EmployeeImportRowDto[];
}
