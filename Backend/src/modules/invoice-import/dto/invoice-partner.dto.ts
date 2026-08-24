import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Parceiro do documento importado — ou já escolhido (`partnerId`) ou
 * dados pra buscar/criar por CNPJ/CPF (`document` + `legalName`).
 */
export class InvoicePartnerDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ValidateIf((dto) => !dto.partnerId)
  @IsString({ message: 'Informe o CPF/CNPJ do fornecedor/cliente.' })
  @MaxLength(20)
  document?: string;

  @ValidateIf((dto) => !dto.partnerId)
  @IsString({ message: 'Informe a razão social/nome do fornecedor/cliente.' })
  @MaxLength(200)
  legalName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  zipCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  street?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;
}
