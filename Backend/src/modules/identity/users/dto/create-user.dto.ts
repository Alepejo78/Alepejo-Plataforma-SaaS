import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {

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

  @ApiPropertyOptional({
    example: 'Administração',
    description: 'Departamento do usuário',
  })
  @IsOptional()
  @IsString({ message: 'O departamento deve ser um texto.' })
  @MaxLength(150, {
    message: 'O departamento deve ter no máximo 150 caracteres.',
  })
  department?: string;

  @ApiPropertyOptional({
    example: 'Angelita',
    description: 'Nome do gerente — só informativo.',
  })
  @IsOptional()
  @IsString({ message: 'O gerente deve ser um texto.' })
  @MaxLength(150, {
    message: 'O gerente deve ter no máximo 150 caracteres.',
  })
  manager?: string;

  @ApiPropertyOptional({
    example: 'Alepejo',
    description: 'Alias do usuário',
  })
  @IsOptional()
  @IsString({ message: 'O alias deve ser um texto.' })
  @MaxLength(150, {
    message: 'O alias deve ter no máximo 150 caracteres.',
  })
  alias?: string;

  @ApiPropertyOptional({
    example: 'clx1234567890',
    description: 'Perfil de segurança (Role) do usuário',
  })
  @IsOptional()
  @IsString({ message: 'O perfil de segurança deve ser um texto.' })
  roleId?: string;

  @ApiPropertyOptional({
    example: ['clx1234567890', 'clx0987654321'],
    description:
      'Empresas do mesmo grupo que este login também pode acessar (login cruzado) — além da empresa dona do cadastro, que sempre tem acesso.',
  })
  @IsOptional()
  @IsArray({ message: 'As empresas devem ser uma lista.' })
  @IsString({ each: true, message: 'Cada empresa deve ser um texto.' })
  companyIds?: string[];
}