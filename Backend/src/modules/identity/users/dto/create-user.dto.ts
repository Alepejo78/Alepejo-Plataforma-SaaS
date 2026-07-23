import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'cmrwjaeux0000y8akgy83spq1',
    description: 'ID da empresa',
  })
  @IsString({ message: 'O ID da empresa deve ser um texto.' })
  @IsNotEmpty({ message: 'A empresa é obrigatória.' })
  companyId: string;

  @ApiProperty({
    example: 'Administrador',
    description: 'Nome do usuário',
  })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MaxLength(150, {
    message: 'O nome deve ter no máximo 150 caracteres.',
  })
  name: string;

  @ApiProperty({
    example: 'admin@alepejo.com.br',
    description: 'E-mail de acesso',
  })
  @IsEmail({}, { message: 'E-mail inválido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @MaxLength(150, {
    message: 'O e-mail deve ter no máximo 150 caracteres.',
  })
  email: string;

  @ApiProperty({
    example: 'Senha@123',
    description: 'Senha do usuário',
  })
  @IsString({ message: 'A senha deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(8, {
    message: 'A senha deve possuir no mínimo 8 caracteres.',
  })
  @MaxLength(100, {
    message: 'A senha deve possuir no máximo 100 caracteres.',
  })
  password: string;
}