import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateUnitOfMeasureDto {
  @ApiProperty({
    example: '8d3b4e4c-7d7d-4a63-8c5d-6a5b4d7f5b8d',
  })
  @IsUUID()
  companyId: string;

  @ApiProperty({
    example: 'UN',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code: string;

  @ApiProperty({
    example: 'Unidade',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  description: string;

  @ApiProperty({
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}