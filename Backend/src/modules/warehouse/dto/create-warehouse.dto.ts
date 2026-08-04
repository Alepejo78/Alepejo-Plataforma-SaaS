import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({
    example: 'DEP001',
    description: 'Código do depósito',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @ApiProperty({
    example: 'Depósito Principal',
    description: 'Descrição do depósito',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  description: string;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}