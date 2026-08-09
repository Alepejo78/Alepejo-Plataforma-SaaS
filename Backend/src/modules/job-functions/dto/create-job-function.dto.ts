import { ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateJobFunctionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Código CBO (ex.: "2521-05") — o título oficial é resolvido no servidor a partir da tabela CBO.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cboCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @ApiPropertyOptional({ enum: SalaryType })
  @IsOptional()
  @IsEnum(SalaryType)
  salaryType?: SalaryType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workScheduleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPpe?: boolean = false;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ppeTypeIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
