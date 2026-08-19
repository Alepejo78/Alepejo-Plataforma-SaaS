import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVacationGrantDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Data de início do gozo (YYYY-MM-DD).' })
  @IsString()
  startDate: string;

  @ApiProperty({ description: 'Dias de descanso efetivo.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  days: number;

  @ApiPropertyOptional({ description: 'Dias vendidos como abono pecuniário (até 10 de 30).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  soldDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observation?: string;
}
