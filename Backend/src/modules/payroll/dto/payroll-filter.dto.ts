import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PayrollFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  competenceYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  competenceMonth?: number;

  @ApiPropertyOptional({ enum: ['DRAFT', 'APPROVED', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'APPROVED', 'CANCELLED'])
  status?: 'DRAFT' | 'APPROVED' | 'CANCELLED';
}
