import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsOptional,
  IsString,
} from 'class-validator';

export class WarehouseFilterDto {
  @ApiPropertyOptional({
    description: 'Pesquisar por código ou descrição',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Somente ativos',
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  active?: string;
}