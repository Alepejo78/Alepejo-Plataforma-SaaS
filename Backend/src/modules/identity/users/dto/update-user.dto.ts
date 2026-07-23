import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    example: 'Administrador do Sistema',
    description: 'Nome do usuário',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 'admin@alepejo.com.br',
    description: 'E-mail do usuário',
  })
  email?: string;

  @ApiPropertyOptional({
    example: 'NovaSenha@123',
    description: 'Nova senha do usuário',
  })
  password?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Status do usuário',
  })
  active?: boolean;
}