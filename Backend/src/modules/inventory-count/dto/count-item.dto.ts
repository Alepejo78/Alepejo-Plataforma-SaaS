import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CountItemDto {
  @ApiProperty({
    description: 'Código de barras ou código do produto lido.',
  })
  @IsString()
  code: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    required: false,
    description:
      'Confirma incluir o produto na contagem quando ele não fazia parte da lista de abertura.',
  })
  @IsOptional()
  @IsBoolean()
  confirmAdd?: boolean;
}
