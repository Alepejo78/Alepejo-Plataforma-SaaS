import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateInventoryCountItemDto } from './create-inventory-count-item.dto';

export class CreateInventoryCountDto {
  @ApiProperty()
  @IsString()
  warehouseId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  countDate?: Date;

  @ApiProperty({
    description:
      'Motivo da contagem (ex.: "Contagem mensal de agosto") — obrigatório.',
  })
  @IsString({ message: 'Informe o motivo da contagem.' })
  @MaxLength(500)
  observation: string;

  @ApiProperty({ type: [CreateInventoryCountItemDto] })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'Adicione ao menos um produto pra contar.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryCountItemDto)
  items: CreateInventoryCountItemDto[];
}
