import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CompanyAdditionalDto {
  @ApiProperty({ example: 'Filial Exemplo Ltda' })
  @IsString({ message: 'A razão social deve ser um texto.' })
  @IsNotEmpty({ message: 'A razão social é obrigatória.' })
  @MaxLength(200)
  legalName: string;

  @ApiPropertyOptional({ example: 'Filial Exemplo' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @ApiProperty({
    example: '12345678000280',
    description:
      'CNPJ (14 dígitos) ou CPF (11 dígitos). CNPJ precisa ter a mesma raiz (8 primeiros dígitos) da empresa que já tem a licença; CPF não tem essa raiz, exige `isGroupCompany`.',
  })
  @IsString({ message: 'O documento deve ser um texto.' })
  @IsNotEmpty({ message: 'O documento é obrigatório.' })
  @MaxLength(20)
  document: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Confirmação manual de que é empresa do grupo — obrigatório quando o documento é CPF, que não tem raiz pra conferir automaticamente como o CNPJ.',
  })
  @IsOptional()
  @IsBoolean()
  isGroupCompany?: boolean;

  @ApiPropertyOptional({ example: 'contato@filial.com.br' })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ example: '(43) 99999-9999' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({
    example: 'Fulano de Tal',
    description: 'Nome do administrador desta empresa nova',
  })
  @IsString({ message: 'O nome do administrador deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do administrador é obrigatório.' })
  @MaxLength(150)
  adminName: string;

  @ApiProperty({
    example: 'admin@filial.com.br',
    description: 'E-mail de login do administrador desta empresa nova',
  })
  @IsEmail({}, { message: 'E-mail do administrador inválido.' })
  @IsNotEmpty({ message: 'O e-mail do administrador é obrigatório.' })
  @MaxLength(150)
  adminEmail: string;
}
