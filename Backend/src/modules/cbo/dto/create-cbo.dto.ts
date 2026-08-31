import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateCboDto {
  @ApiProperty({
    description: 'Código CBO no formato NNNN-NN (ex.: "2527-15").',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'Código CBO deve estar no formato NNNN-NN (ex.: 2527-15).',
  })
  code: string;

  @ApiProperty({ description: 'Título da ocupação (ex.: "Analista de logística").' })
  @IsString()
  @MaxLength(200)
  title: string;
}
