import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({
    description: 'Id do usuário (vem no link do e-mail)',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Token de redefinição (vem no link do e-mail)',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'Senha@123',
  })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(8, {
    message: 'A senha deve possuir no mínimo 8 caracteres.',
  })
  @MaxLength(100, {
    message: 'A senha deve possuir no máximo 100 caracteres.',
  })
  password: string;
}
