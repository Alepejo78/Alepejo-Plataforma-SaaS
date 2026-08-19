import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePayrollSettingsDto {
  @ApiPropertyOptional({
    description: 'Adicional de hora extra, em % (ex.: 50 = paga 150% do valor/hora).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  extraHourSurchargePercentage?: number;

  @ApiPropertyOptional({
    description: '% do salário base descontado como Vale Transporte.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  transportVoucherPercentage?: number;

  @ApiPropertyOptional({
    description: '1 = parcela única de 13º; 2 = duas parcelas.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2)
  thirteenthDefaultInstallments?: number;
}
