import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollTaxType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayrollTaxBracketDto {
  @ApiProperty({ enum: PayrollTaxType })
  @IsEnum(PayrollTaxType)
  taxType: PayrollTaxType;

  @ApiProperty({ description: 'Ordem da faixa (1 = primeira).' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBase: number;

  @ApiPropertyOptional({
    description: 'Vazio = sem teto (última faixa).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxBase?: number;

  @ApiProperty({ description: 'Alíquota da faixa, em % (ex.: 14 = 14%).' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiProperty({ description: 'Parcela a deduzir, em R$.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deduction: number;
}
