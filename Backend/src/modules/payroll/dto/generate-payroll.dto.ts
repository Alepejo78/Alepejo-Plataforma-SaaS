import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GeneratePayrollDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  competenceYear: number;

  @ApiProperty({ example: 8, description: 'Mês da competência (1-12).' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  competenceMonth: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observation?: string;
}
