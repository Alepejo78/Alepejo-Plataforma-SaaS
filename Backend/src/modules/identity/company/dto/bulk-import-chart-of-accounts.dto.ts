import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { ChartOfAccountType } from '@prisma/client';

export class BulkImportChartOfAccountRowDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;
}

export class BulkImportChartOfAccountGroupDto {
  @ApiProperty({
    description: 'Nome da classificação (grupo) — achada pelo nome ou criada.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  classification: string;

  @ApiProperty({
    enum: ChartOfAccountType,
    required: false,
    description: 'Vale pra todas as contas do grupo. Padrão DESPESA.',
  })
  @IsOptional()
  @IsEnum(ChartOfAccountType)
  type?: ChartOfAccountType;

  @ApiProperty({ type: [BulkImportChartOfAccountRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkImportChartOfAccountRowDto)
  accounts: BulkImportChartOfAccountRowDto[];
}

export class BulkImportChartOfAccountsDto {
  @ApiProperty({ type: [BulkImportChartOfAccountGroupDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkImportChartOfAccountGroupDto)
  groups: BulkImportChartOfAccountGroupDto[];
}
