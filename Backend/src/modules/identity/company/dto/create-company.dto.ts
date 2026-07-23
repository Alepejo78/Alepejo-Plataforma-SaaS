import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({
    example: 'EMP001',
    description: 'Código interno da empresa',
  })
  @IsString({ message: 'O código deve ser um texto.' })
  @IsNotEmpty({ message: 'O código é obrigatório.' })
  @MaxLength(20, { message: 'O código deve ter no máximo 20 caracteres.' })
  code: string;

  @ApiProperty({
    example: 'AlePejo Tecnologia LTDA',
    description: 'Razão Social',
  })
  @IsString({ message: 'A razão social deve ser um texto.' })
  @IsNotEmpty({ message: 'A razão social é obrigatória.' })
  @MaxLength(200, {
    message: 'A razão social deve ter no máximo 200 caracteres.',
  })
  legalName: string;

  @ApiPropertyOptional({
    example: 'AlePejo ERP',
    description: 'Nome Fantasia',
  })
  @IsOptional()
  @IsString({ message: 'O nome fantasia deve ser um texto.' })
  @MaxLength(200, {
    message: 'O nome fantasia deve ter no máximo 200 caracteres.',
  })
  tradeName?: string;

  @ApiProperty({
    example: '12345678000199',
    description: 'CNPJ',
  })
  @IsString({ message: 'O CNPJ deve ser um texto.' })
  @IsNotEmpty({ message: 'O CNPJ é obrigatório.' })
  @MaxLength(20, { message: 'O CNPJ deve ter no máximo 20 caracteres.' })
  document: string;

  @ApiPropertyOptional({
    example: '123456789',
  })
  @IsOptional()
  @IsString({ message: 'A inscrição estadual deve ser um texto.' })
  @MaxLength(30)
  stateRegistration?: string;

  @ApiPropertyOptional({
    example: '987654321',
  })
  @IsOptional()
  @IsString({ message: 'A inscrição municipal deve ser um texto.' })
  @MaxLength(30)
  municipalRegistration?: string;

  @ApiPropertyOptional({
    example: 'contato@alepejo.com.br',
  })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({
    example: '(43) 3333-3333',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    example: '(43) 99999-9999',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string;

  @ApiPropertyOptional({
    example: 'https://www.alepejo.com.br',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({
    example: '/uploads/logo.png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  logo?: string;

  @ApiPropertyOptional({
    example: 'America/Sao_Paulo',
    default: 'America/Sao_Paulo',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    example: 'pt-BR',
    default: 'pt-BR',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    example: 'BRL',
    default: 'BRL',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}