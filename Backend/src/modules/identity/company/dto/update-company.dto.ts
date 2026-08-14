import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CreateCompanyDto } from './create-company.dto';

// Redeclarar os campos abaixo só pra doc do Swagger, sem decorator de
// validação, faz o `ValidationPipe({ whitelist, forbidNonWhitelisted })`
// rejeitar QUALQUER PATCH que os inclua ("campo não é permitido") —
// mesmo bug já corrigido em UpdateUserDto nesta sessão. Por isso cada
// campo redeclarado aqui also leva seu próprio decorator.
export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({
    example: 'AlePejo Tecnologia LTDA',
    description: 'Razão Social',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({
    example: 'AlePejo ERP',
    description: 'Nome Fantasia',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

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
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}