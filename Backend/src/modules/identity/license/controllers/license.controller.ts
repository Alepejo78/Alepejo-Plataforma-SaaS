import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../../core/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';

import { LicenseService } from '../services/license.service';

import { AssignCompanyPlanDto } from '../dto/assign-company-plan.dto';
import { EnableModuleDto } from '../dto/enable-module.dto';
import { DisableModuleDto } from '../dto/disable-module.dto';
import { StartTrialDto } from '../dto/start-trial.dto';
import { SetCustomModulesDto } from '../dto/set-custom-modules.dto';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';
import { UpdatePlatformSettingsDto } from '../dto/update-platform-settings.dto';

/**
 * Regras de escopo deste controller:
 *
 * - "/me/*"           -> autoatendimento, sempre a própria empresa
 *                        (companyId vem do JWT, nunca do body/URL).
 * - "/plans", "/modules" (catálogo global)
 *                     -> reservado para administração da plataforma.
 * - "/companies/:id/*" (atribuir plano/módulo a QUALQUER empresa,
 *   dashboard agregado, histórico de outra empresa)
 *                     -> reservado para administração da plataforma
 *                        (permissão platform.license.manage), já que
 *                        ainda não existe um papel de "operador da
 *                        plataforma" separado do admin do tenant.
 */
@ApiTags('Identity - License')
@Controller('identity/license')
export class LicenseController {
  constructor(
    private readonly service: LicenseService,
  ) {}

  // ==========================
  // AUTOATENDIMENTO (própria empresa)
  // ==========================

  @Get('me')
  @Permissions('license.view')
  @ApiOperation({ summary: 'Minha licença/plano atual' })
  getMine(
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.getCompanyLicenses(companyId);
  }

  @Get('me/history')
  @Permissions('license.view')
  @ApiOperation({ summary: 'Meu histórico de licenciamento' })
  historyMine(
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.history(companyId);
  }

  @Post('me/trial')
  @Permissions('license.trial')
  @ApiOperation({ summary: 'Iniciar trial de um módulo para minha empresa' })
  startTrialMine(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: StartTrialDto,
  ) {
    return this.service.startTrial(
      companyId,
      dto.moduleId,
      dto.days,
    );
  }

  @Post('me/custom-modules')
  @Permissions('license.view')
  @ApiOperation({
    summary:
      'Montar/ajustar o plano por módulo avulso da minha empresa (vira Plano Customizado)',
  })
  setCustomModulesMine(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: SetCustomModulesDto,
  ) {
    return this.service.setCustomModules(companyId, dto.moduleIds);
  }

  // ==========================
  // CATÁLOGO GLOBAL (Plans) — plataforma
  // ==========================

  @Get('plans')
  @Permissions('license.catalog.view')
  @ApiOperation({ summary: 'Listar planos' })
  getPlans() {
    return this.service.getPlans();
  }

  @Get('plans/:id')
  @Permissions('license.catalog.view')
  @ApiOperation({ summary: 'Buscar plano' })
  getPlan(@Param('id') id: string) {
    return this.service.getPlan(id);
  }

  @Post('plans')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Criar plano' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.service.createPlan(dto);
  }

  @Patch('plans/:id')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Atualizar plano' })
  updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.service.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Excluir plano' })
  removePlan(@Param('id') id: string) {
    return this.service.removePlan(id);
  }

  // ==========================
  // Configurações da plataforma
  // ==========================

  @Get('platform-settings')
  @Permissions('license.catalog.view')
  @ApiOperation({ summary: 'Configurações gerais da plataforma (ex.: dias de teste grátis)' })
  getPlatformSettings() {
    return this.service.getPlatformSettings();
  }

  @Patch('platform-settings')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Atualizar configurações gerais da plataforma' })
  updatePlatformSettings(@Body() dto: UpdatePlatformSettingsDto) {
    return this.service.updatePlatformSettings(dto.trialDays);
  }

  // ==========================
  // CATÁLOGO GLOBAL (Modules) — plataforma
  // ==========================

  @Get('modules')
  @Permissions('license.catalog.view')
  @ApiOperation({ summary: 'Listar módulos' })
  getModules() {
    return this.service.getModules();
  }

  @Get('modules/:id')
  @Permissions('license.catalog.view')
  @ApiOperation({ summary: 'Buscar módulo' })
  getModule(@Param('id') id: string) {
    return this.service.getModule(id);
  }

  @Post('modules')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Criar módulo' })
  createModule(@Body() dto: CreateModuleDto) {
    return this.service.createModule(dto);
  }

  @Patch('modules/:id')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Atualizar módulo' })
  updateModule(
    @Param('id') id: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.service.updateModule(id, dto);
  }

  @Delete('modules/:id')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Excluir módulo' })
  removeModule(@Param('id') id: string) {
    return this.service.removeModule(id);
  }

  // ==========================
  // GESTÃO DE LICENÇA DE OUTRAS EMPRESAS — plataforma
  // ==========================

  @Get('companies/:companyId')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Ver licença de uma empresa específica' })
  getCompany(@Param('companyId') companyId: string) {
    return this.service.getCompanyLicenses(companyId);
  }

  @Get('companies/:companyId/history')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Histórico de licenciamento de uma empresa' })
  history(@Param('companyId') companyId: string) {
    return this.service.history(companyId);
  }

  @Post('companies/:companyId/plan')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Atribuir plano a uma empresa' })
  assignPlan(
    @Param('companyId') companyId: string,
    @Body() dto: AssignCompanyPlanDto,
  ) {
    return this.service.assignPlan(
      companyId,
      dto.planId,
      dto.trialEndsAt ? new Date(dto.trialEndsAt) : undefined,
    );
  }

  @Post('companies/:companyId/modules')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Habilitar módulo para uma empresa' })
  enableModule(
    @Param('companyId') companyId: string,
    @Body() dto: EnableModuleDto,
  ) {
    return this.service.enableModule(
      companyId,
      dto.moduleId,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );
  }

  @Patch('companies/:companyId/modules/disable')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Desabilitar módulo de uma empresa' })
  disableModule(
    @Param('companyId') companyId: string,
    @Body() dto: DisableModuleDto,
  ) {
    return this.service.disableModule(
      companyId,
      dto.moduleId,
    );
  }

  // ==========================
  // DASHBOARD AGREGADO — plataforma
  // ==========================

  @Get('dashboard')
  @Permissions('platform.license.manage')
  @ApiOperation({ summary: 'Dashboard geral de licenciamento (todas empresas)' })
  dashboard() {
    return this.service.getDashboard();
  }
}
