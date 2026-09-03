import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PublicRequestRevisionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Descreva o que precisa ser revisado.' })
  @MaxLength(2000)
  message: string;
}
