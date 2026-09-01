import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PayrollStatus } from '@prisma/client';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Public } from '../../../core/decorators/public.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { VacationGrantService } from '../services/vacation-grant.service';
import { VacationPeriodService } from '../services/vacation-period.service';
import { VacationConfirmationService } from '../services/vacation-confirmation.service';
import { EmployeesService } from '../../employees/services/employees.service';

import { CreateVacationGrantDto } from '../dto/create-vacation-grant.dto';
import { CreateMyVacationGrantDto } from '../dto/create-my-vacation-grant.dto';
import { AdjustPayrollItemDto } from '../dto/adjust-payroll-item.dto';

@ApiTags('Vacation')
@Controller('vacation')
@Module('LABOR')
export class VacationController {
  constructor(
    private readonly grantService: VacationGrantService,
    private readonly periodService: VacationPeriodService,
    private readonly confirmationService: VacationConfirmationService,
    private readonly employeesService: EmployeesService,
  ) {}

  /** Rotas públicas (sem login) — precisam vir antes de `grants/:id`. */
  @Public()
  @Get('public/:id')
  getPublicInfo(@Param('id') id: string, @Query('token') token: string) {
    return this.confirmationService.getPublicInfo(id, token);
  }

  @Public()
  @Post('public/:id/confirm')
  confirmPublic(@Param('id') id: string, @Query('token') token: string) {
    return this.confirmationService.confirmPublic(id, token);
  }

  /**
   * Autoatendimento — sem permissão nenhuma (mesmo padrão de
   * `EmployeesController.findMine`). Precisam vir antes de
   * `grants/:id` pelo mesmo motivo das rotas públicas acima.
   */
  @Get('me/periods')
  @ApiOperation({ summary: 'Meu saldo/histórico de períodos aquisitivos (autoatendimento)' })
  async findMinePeriods(@CurrentUser('companyId') companyId: string, @CurrentUser('id') userId: string) {
    const employee = await this.employeesService.findMine(companyId, userId);
    return this.periodService.findAllByEmployee(companyId, employee.id);
  }

  @Get('me/grants')
  @ApiOperation({ summary: 'Meus pedidos de férias (autoatendimento)' })
  async findMineGrants(@CurrentUser('companyId') companyId: string, @CurrentUser('id') userId: string) {
    const employee = await this.employeesService.findMine(companyId, userId);
    return this.grantService.findAll(companyId, { employeeId: employee.id });
  }

  @Post('me/grants')
  @ApiOperation({ summary: 'Pedir férias (autoatendimento — nasce aguardando aprovação do RH)' })
  async createMineGrant(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMyVacationGrantDto,
  ) {
    const employee = await this.employeesService.findMine(companyId, userId);
    return this.grantService.create(companyId, rootCompanyId, { ...dto, employeeId: employee.id });
  }

  @Get('balance')
  @Permissions('vacation.view')
  @ApiOperation({ summary: 'Saldo do período aquisitivo aberto de um colaborador' })
  getBalance(
    @CurrentUser('companyId') companyId: string,
    @Query('employeeId') employeeId: string,
  ) {
    return this.periodService.getBalance(companyId, employeeId);
  }

  @Get('periods')
  @Permissions('vacation.view')
  @ApiOperation({ summary: 'Histórico de períodos aquisitivos de um colaborador' })
  findPeriods(
    @CurrentUser('companyId') companyId: string,
    @Query('employeeId') employeeId: string,
  ) {
    return this.periodService.findAllByEmployee(companyId, employeeId);
  }

  @Post('grants')
  @Permissions('vacation.create')
  @ApiOperation({ summary: 'Conceder férias a um colaborador' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @Body() dto: CreateVacationGrantDto,
  ) {
    return this.grantService.create(companyId, rootCompanyId, dto);
  }

  @Get('grants')
  @Permissions('vacation.view')
  @ApiOperation({ summary: 'Listar gozos de férias' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: PayrollStatus,
  ) {
    return this.grantService.findAll(companyId, { employeeId, status });
  }

  @Get('grants/:id')
  @Permissions('vacation.view')
  @ApiOperation({ summary: 'Detalhar gozo de férias (recibo)' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.grantService.findOne(companyId, id);
  }

  @Patch('grants/:id')
  @Permissions('vacation.update')
  @ApiOperation({ summary: 'Ajustar proventos/descontos manuais' })
  adjust(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: AdjustPayrollItemDto,
  ) {
    return this.grantService.adjust(companyId, id, dto);
  }

  @Patch('grants/:id/approve')
  @Permissions('vacation.approve')
  @ApiOperation({ summary: 'Aprovar (gera título a pagar)' })
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.grantService.approve(companyId, rootCompanyId, id, userId);
  }

  @Patch('grants/:id/reverse')
  @Permissions('vacation.approve')
  @ApiOperation({
    summary: 'Estornar aprovação (volta a aguardar aprovação, apaga o título gerado)',
  })
  reverse(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.grantService.reverse(companyId, id);
  }

  @Patch('grants/:id/cancel')
  @Permissions('vacation.cancel')
  @ApiOperation({ summary: 'Cancelar (devolve os dias ao saldo)' })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.grantService.cancel(companyId, id);
  }

  @Patch('grants/:id/confirm')
  @Permissions('vacation.confirm-item')
  @ApiOperation({ summary: 'Confirmar recebimento do recibo manualmente' })
  confirmItem(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.confirmationService.confirm(companyId, id, userId);
  }

  @Post('grants/:id/send-confirmation')
  @Permissions('vacation.confirm-item')
  @ApiOperation({ summary: 'Enviar link de confirmação do recibo por e-mail/WhatsApp' })
  sendConfirmation(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.confirmationService.sendConfirmation(companyId, id);
  }
}
