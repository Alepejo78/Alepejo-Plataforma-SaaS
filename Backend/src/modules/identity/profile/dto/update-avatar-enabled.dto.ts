import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAvatarEnabledDto {
  @ApiProperty({
    description: 'Mostrar a foto enviada no lugar das iniciais.',
  })
  @IsBoolean()
  enabled: boolean;
}
