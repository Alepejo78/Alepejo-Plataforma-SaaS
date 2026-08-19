import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Ajuste manual num item da folha antes de aprovar — cobre proventos/
 * descontos que o motor de cálculo não deduz sozinho (comissão,
 * remuneração variável, adiantamentos etc.), conforme previsto no
 * desenho do módulo.
 */
export class AdjustPayrollItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherEarnings?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherDeductions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observation?: string;
}
