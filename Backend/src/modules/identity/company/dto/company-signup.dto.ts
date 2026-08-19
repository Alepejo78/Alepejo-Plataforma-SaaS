import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
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

  @ApiPropertyOptional({
    example: 'contato@empresa.com.br',
    description: 'E-mail de contato da empresa — não é o de login.',
  })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ example: '(43) 99999-9999' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @ApiProperty({
    example: 'Fulano de Tal',
    description: 'Nome do administrador (primeiro usuário)',
  })
  @IsString({ message: 'O nome do administrador deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do administrador é obrigatório.' })
  @MaxLength(150)
  adminName: string;

  @ApiProperty({
    example: 'admin@empresa.com.br',
    description: 'E-mail de login do primeiro usuário (administrador).',
  })
  @IsEmail({}, { message: 'E-mail do administrador inválido.' })
  @IsNotEmpty({ message: 'O e-mail do administrador é obrigatório.' })
  @MaxLength(150)
  adminEmail: string;

  @ApiProperty({
    description:
      'Id do plano escolhido em /planos — a conta nasce em período de teste com os módulos desse plano.',
  })
  @IsString({ message: 'Selecione um plano.' })
  @IsNotEmpty({ message: 'Selecione um plano.' })
  planId: string;

  @ApiPropertyOptional({
    description:
      'Só pro plano Customizado (code CUSTOM) — ids dos módulos escolhidos no montador.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moduleIds?: string[];
}
