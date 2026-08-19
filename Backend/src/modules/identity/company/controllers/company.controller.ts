import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../../../../core/decorators/public.decorator';
import { CurrentUser } from '../../../../core/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { AuthService } from '../../auth/services/auth.service';
import { setSessionCookies } from '../../auth/constants/cookie.constants';

import { CompanyService } from '../services/company.service';
import { CompanyOnboardingService } from '../services/company-onboarding.service';
import { LicenseService } from '../../license/services/license.service';

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
    private readonly licenseService: LicenseService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Página pública de preços (`/planos`) não tem sessão — precisa de
   * uma rota sem autenticação pra listar os planos. Mesmos dados de
   * `GET /identity/license/plans` (autenticado), só que aberta.
   */
  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Listar planos comerciais (público, pra página de preços)' })
  getPublicPlans() {
    return this.licenseService.getPlans();
  }

  /**
   * Catálogo de módulos avulsos (público) — alimenta o montador do
   * plano Customizado em `/planos`, que precisa do preço de cada
   * módulo antes de qualquer cadastro/sessão existir.
   */
  @Public()
  @Get('modules')
  @ApiOperation({ summary: 'Listar módulos avulsos (público, pro montador de plano customizado)' })
  getPublicModules() {
    return this.licenseService.getModules();
  }

  /**
   * Dias de teste grátis, pra mostrar no botão de `/planos`
   * ("Começar teste de X dias") — vem de Administrar planos, não é
   * mais fixo no código.
   */
  @Public()
  @Get('trial-days')
  @ApiOperation({ summary: 'Dias de teste grátis vigente (público, pra página de preços)' })
  async getPublicTrialDays() {
    const settings = await this.licenseService.getPlatformSettings();

    return { trialDays: settings.trialDays };
  }

  /**
   * Página pública de login com o nome da empresa na URL
   * (`/<slug>/login`) também não tem sessão — só o nome, nada sensível.
   */
  @Public()
  @Get('by-slug/:slug')
  @ApiOperation({
    summary: 'Nome da empresa a partir do slug (público, pra tela de login com o nome da empresa)',
  })
  getPublicBySlug(@Param('slug') slug: string) {
    return this.companyService.findPublicBySlug(slug);
  }

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
  async signup(
    @Body() dto: CompanySignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { companyId, userId } = await this.onboardingService.signup(dto);

    if (!dto.payNow) {
      return { companyId };
    }

    // Pagar na hora exige sessão pra chamar POST /billing/me/subscribe
    // em seguida — abre aqui, na mesma resposta que acabou de criar a
    // conta (ver AuthService.issueSessionForUser). O fluxo de definir
    // senha por e-mail continua acontecendo do mesmo jeito, pra quando
    // essa sessão inicial expirar.
    const tokens = await this.authService.issueSessionForUser(userId);
    setSessionCookies(res, tokens);

    return { companyId };
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
