import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PublicCancelServiceOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo do cancelamento.' })
  @MaxLength(2000)
  reason: string;
}
