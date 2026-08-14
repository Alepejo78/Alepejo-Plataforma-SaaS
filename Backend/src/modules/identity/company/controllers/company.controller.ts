import {
  Body,
  Controller,
  Get,
  Param,
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
import { CompanyOnboardingService } from '../services/company-onboarding.service';

import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanySignupDto } from '../dto/company-signup.dto';
import { CompanyAdditionalDto } from '../dto/company-additional.dto';

/**
 * Não existe (ainda) um conceito de administrador de plataforma
 * capaz de gerenciar todas as empresas do SaaS. Por isso, este
 * controller expõe: autoatendimento de cadastro (`signup`, público,
 * cliente novo), cadastro de empresa adicional do mesmo cliente já
 * licenciado (`additional`, autenticado, mesma raiz de CNPJ da
 * empresa que já tem a licença — ver CompanyOnboardingService) e o
 * próprio autoatendimento de dados (`me`): uma empresa só vê/altera
 * os próprios dados (identificados pelo token JWT).
 *
 * A listagem/edição/exclusão de empresas arbitrárias por ID foi
 * removida propositalmente para evitar vazamento entre tenants.
 */
@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly onboardingService: CompanyOnboardingService,
  ) {}

  @Public()
  @Post('signup')
  @ApiOperation({
    summary:
      'Cadastro de cliente novo (empresa + plano + perfil admin + primeiro usuário)',
  })
  @ApiResponse({
    status: 201,
    description: 'Empresa cadastrada — usuário recebe e-mail para definir a senha.',
  })
  @ApiResponse({
    status: 409,
    description: 'Documento já cadastrado.',
  })
  signup(@Body() dto: CompanySignupDto) {
    return this.onboardingService.signup(dto);
  }

  @Post('additional')
  @Permissions('company.create')
  @ApiOperation({
    summary:
      'Cadastrar outra empresa do mesmo cliente (mesma raiz de CNPJ da empresa já licenciada)',
  })
  @ApiResponse({
    status: 201,
    description: 'Empresa cadastrada, herdando o plano/módulos da empresa raiz.',
  })
  @ApiResponse({
    status: 400,
    description: 'CNPJ não bate com a raiz da empresa já licenciada.',
  })
  createAdditional(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompanyAdditionalDto,
  ) {
    return this.onboardingService.createAdditional(
      user.companyId,
      user.id,
      user.email,
      dto,
    );
  }

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

  @Get('my-companies')
  @ApiOperation({
    summary:
      'Listar empresas que este login pode acessar (login cruzado, ver UserCompany)',
  })
  myCompanies(@CurrentUser('id') userId: string) {
    return this.companyService.getMyCompanies(userId);
  }

  @Get('group')
  @Permissions('company.view')
  @ApiOperation({
    summary:
      'Listar empresas do meu grupo (raiz + filiais com a mesma raiz de CNPJ)',
  })
  findGroup(@CurrentUser('companyId') companyId: string) {
    return this.companyService.getGroup(companyId);
  }

  @Patch('group/:id')
  @Permissions('company.update')
  @ApiOperation({
    summary:
      'Atualizar (ou ativar/desativar) uma empresa do meu grupo',
  })
  @ApiResponse({
    status: 403,
    description: 'A empresa não pertence ao seu grupo.',
  })
  updateInGroup(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.updateInGroup(companyId, id, dto);
  }
}
