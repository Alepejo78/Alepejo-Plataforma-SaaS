import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CompanySignupDto {
  @ApiProperty({ example: 'Empresa Exemplo Ltda' })
  @IsString({ message: 'A razão social deve ser um texto.' })
  @IsNotEmpty({ message: 'A razão social é obrigatória.' })
  @MaxLength(200)
  legalName: string;

  @ApiPropertyOptional({ example: 'Empresa Exemplo' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @ApiProperty({ example: '12345678000199' })
  @IsString({ message: 'O CNPJ deve ser um texto.' })
  @IsNotEmpty({ message: 'O CNPJ é obrigatório.' })
  @MaxLength(20)
  document: string;

  @ApiProperty({
    example: 'contato@empresa.com.br',
    description:
      'Também é o e-mail de login do primeiro usuário (administrador).',
  })
  @IsEmail({}, { message: 'E-mail inválido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @MaxLength(150)
  email: string;

  @ApiPropertyOptional({ example: '(43) 99999-9999' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({
    example: 'Fulano de Tal',
    description: 'Nome do administrador (primeiro usuário)',
  })
  @IsString({ message: 'O nome do administrador deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do administrador é obrigatório.' })
  @MaxLength(150)
  adminName: string;
}
