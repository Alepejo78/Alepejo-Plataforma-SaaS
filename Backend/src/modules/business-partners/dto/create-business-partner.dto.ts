import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  BusinessPartnerRole,
  BusinessPartnerStatus,
  PersonType,
} from '@prisma/client';

export class CreateBusinessPartnerDto {
  /**
   * Papéis do parceiro (CUSTOMER, SUPPLIER, CARRIER, SALES_REP).
   * Pelo menos um é obrigatório: um cadastro sem papel não teria
   * utilidade em nenhuma operação.
   */
  @IsArray({ message: 'Papéis deve ser uma lista.' })
  @ArrayMinSize(1, {
    message:
      'Selecione ao menos um papel (cliente, fornecedor, etc.).',
  })
  @IsEnum(BusinessPartnerRole, { each: true, message: 'Papel inválido.' })
  roles!: BusinessPartnerRole[];

  @IsOptional()
  @IsEnum(PersonType, { message: 'Tipo de pessoa inválido.' })
  personType?: PersonType;

  @IsString({ message: 'Razão social/Nome deve ser um texto.' })
  @IsNotEmpty({ message: 'Razão social/Nome é obrigatório.' })
  @MaxLength(200, { message: 'Razão social/Nome deve ter no máximo 200 caracteres.' })
  legalName!: string;

  @IsOptional()
  @IsString({ message: 'Nome fantasia deve ser um texto.' })
  @MaxLength(200, { message: 'Nome fantasia deve ter no máximo 200 caracteres.' })
  tradeName?: string;

  @IsString({ message: 'CPF/CNPJ deve ser um texto.' })
  @IsNotEmpty({ message: 'CPF/CNPJ é obrigatório.' })
  @MaxLength(20, { message: 'CPF/CNPJ deve ter no máximo 20 caracteres.' })
  document!: string;

  @IsOptional()
  @IsString({ message: 'Inscrição estadual deve ser um texto.' })
  @MaxLength(30, { message: 'Inscrição estadual deve ter no máximo 30 caracteres.' })
  stateRegistration?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  @MaxLength(150, { message: 'E-mail deve ter no máximo 150 caracteres.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Telefone deve ser um texto.' })
  @MaxLength(30, { message: 'Telefone deve ter no máximo 30 caracteres.' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Celular deve ser um texto.' })
  @MaxLength(30, { message: 'Celular deve ter no máximo 30 caracteres.' })
  mobile?: string;

  @IsOptional()
  @IsString({ message: 'Contato deve ser um texto.' })
  @MaxLength(150, { message: 'Contato deve ter no máximo 150 caracteres.' })
  contactName?: string;

  @IsOptional()
  @IsString({ message: 'CEP deve ser um texto.' })
  @MaxLength(15, { message: 'CEP deve ter no máximo 15 caracteres.' })
  zipCode?: string;

  @IsOptional()
  @IsString({ message: 'Logradouro deve ser um texto.' })
  @MaxLength(150, { message: 'Logradouro deve ter no máximo 150 caracteres.' })
  street?: string;

  @IsOptional()
  @IsString({ message: 'Número deve ser um texto.' })
  @MaxLength(20, { message: 'Número deve ter no máximo 20 caracteres.' })
  number?: string;

  @IsOptional()
  @IsString({ message: 'Complemento deve ser um texto.' })
  @MaxLength(100, { message: 'Complemento deve ter no máximo 100 caracteres.' })
  complement?: string;

  @IsOptional()
  @IsString({ message: 'Bairro deve ser um texto.' })
  @MaxLength(100, { message: 'Bairro deve ter no máximo 100 caracteres.' })
  district?: string;

  @IsOptional()
  @IsString({ message: 'Cidade deve ser um texto.' })
  @MaxLength(100, { message: 'Cidade deve ter no máximo 100 caracteres.' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'UF deve ser um texto.' })
  @MaxLength(2, { message: 'UF deve ter no máximo 2 caracteres.' })
  state?: string;

  @IsOptional()
  @IsString({ message: 'Observações deve ser um texto.' })
  notes?: string;

  @IsOptional()
  @IsEnum(BusinessPartnerStatus, { message: 'Situação inválido.' })
  status?: BusinessPartnerStatus;

  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser verdadeiro ou falso.' })
  active?: boolean;
}
