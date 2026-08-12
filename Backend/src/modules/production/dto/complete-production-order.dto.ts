import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteProductionOrderDto {
  @ApiProperty({ description: 'Data em que a produção terminou de verdade.' })
  @IsDateString()
  completedAt: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;
}
