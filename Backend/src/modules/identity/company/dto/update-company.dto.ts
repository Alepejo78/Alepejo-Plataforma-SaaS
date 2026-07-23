import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({
    example: 'AlePejo Tecnologia LTDA',
    description: 'Razão Social',
  })
  legalName?: string;

  @ApiPropertyOptional({
    example: 'AlePejo ERP',
    description: 'Nome Fantasia',
  })
  tradeName?: string;

  @ApiPropertyOptional({
    example: 'contato@alepejo.com.br',
  })
  email?: string;

  @ApiPropertyOptional({
    example: '(43) 3333-3333',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: '(43) 99999-9999',
  })
  mobile?: string;

  @ApiPropertyOptional({
    example: 'https://www.alepejo.com.br',
  })
  website?: string;

  @ApiPropertyOptional({
    example: true,
  })
  active?: boolean;
}