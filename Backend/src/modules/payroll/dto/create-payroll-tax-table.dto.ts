import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreatePayrollTaxBracketDto } from './create-payroll-tax-bracket.dto';

export class CreatePayrollTaxTableDto {
  @ApiProperty({
    description:
      'A partir de quando essa tabela vale — a vigência anterior (se houver) é encerrada automaticamente no dia anterior.',
  })
  @IsDateString()
  validFrom: string;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fgtsPercentage?: number;

  @ApiProperty({
    description: 'Dedução mensal de IRRF por dependente, em R$.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dependentDeductionValue: number;

  @ApiPropertyOptional({
    description:
      'Base tributável a partir da qual passa a ter IRRF (isenção abaixo disso) — redutor adicional 2026.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  irrfReliefThreshold?: number;

  @ApiPropertyOptional({
    description: 'Base tributável acima da qual o redutor deixa de valer.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  irrfReliefPhaseOutEnd?: number;

  @ApiPropertyOptional({
    description: 'Parte fixa da fórmula do redutor (ex.: 978.62).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  irrfReliefBase?: number;

  @ApiPropertyOptional({
    description: 'Fator multiplicado pela base na fórmula do redutor (ex.: 0.133145).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  irrfReliefFactor?: number;

  @ApiProperty({ type: [CreatePayrollTaxBracketDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePayrollTaxBracketDto)
  brackets: CreatePayrollTaxBracketDto[];
}
