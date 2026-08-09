import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ChartOfAccountType } from '@prisma/client';

export class CreateChartOfAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @IsString()
  @IsNotEmpty()
  classificationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @IsOptional()
  @IsEnum(ChartOfAccountType)
  type?: ChartOfAccountType = ChartOfAccountType.DESPESA;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
