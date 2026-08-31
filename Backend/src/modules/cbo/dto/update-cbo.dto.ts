import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateCboDto {
  @ApiProperty({ description: 'Título da ocupação (ex.: "Analista de logística").' })
  @IsString()
  @MaxLength(200)
  title: string;
}
