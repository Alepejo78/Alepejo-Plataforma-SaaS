import { ApiProperty } from '@nestjs/swagger';

import {
  IsEmail,
  IsNotEmpty,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@empresa.com',
  })
  @IsEmail(
    {},
    {
      message: 'E-mail inválido.',
    },
  )
  @IsNotEmpty({
    message: 'O e-mail é obrigatório.',
  })
  email: string;

  @ApiProperty({
    example: '123456',
  })
  @IsNotEmpty({
    message: 'A senha é obrigatória.',
  })
  @MinLength(6, {
    message: 'A senha deve possuir no mínimo 6 caracteres.',
  })
  password: string;
}