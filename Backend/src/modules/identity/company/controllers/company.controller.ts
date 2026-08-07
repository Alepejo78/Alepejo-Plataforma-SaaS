import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../../../../core/decorators/public.decorator';
import { CurrentUser } from '../../../../core/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

import { CompanyService } from '../services/company.service';

import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';

/**
 * Não existe (ainda) um conceito de administrador de plataforma
 * capaz de gerenciar todas as empresas do SaaS. Por isso, este
 * controller expõe apenas o autoatendimento: uma empresa só pode
 * ver/alterar os próprios dados (identificados pelo token JWT).
 *
 * A listagem/edição/exclusão de empresas arbitrárias por ID foi
 * removida propositalmente para evitar vazamento entre tenants.
 */
@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
  ) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Cadastrar nova empresa (onboarding/self-signup)',
  })
  @ApiResponse({
    status: 201,
    description: 'Empresa cadastrada com sucesso.',
  })
  @ApiResponse({
    status: 409,
    description: 'Documento já cadastrado.',
  })
  create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Get('me')
  @Permissions('company.view')
  @ApiOperation({ summary: 'Dados da minha empresa' })
  @ApiResponse({
    status: 200,
    description: 'Empresa encontrada.',
  })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.companyService.findById(user.companyId);
  }

  @Patch('me')
  @Permissions('company.update')
  @ApiOperation({ summary: 'Atualizar minha empresa' })
  @ApiResponse({
    status: 200,
    description: 'Empresa atualizada.',
  })
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(user.companyId, dto);
  }
}
