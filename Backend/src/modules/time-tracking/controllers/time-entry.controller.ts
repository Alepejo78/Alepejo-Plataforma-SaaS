import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Public } from '../../../core/decorators/public.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';
import type { AuthenticatedUser } from '../../identity/auth/interfaces/authenticated-user.interface';

import { TimeTrackingService } from '../services/time-tracking.service';
import { TimeEntryConfirmationService } from '../services/time-entry-confirmation.service';
import { EmployeesService } from '../../employees/services/employees.service';

import { CreateTimeEntryDto } from '../dto/create-time-entry.dto';
import { TimeEntryFilterDto } from '../dto/time-entry-filter.dto';
import { DayActionDto } from '../dto/day-action.dto';
import { AdjustDayDto } from '../dto/adjust-day.dto';
import { SelfReportDayDto } from '../dto/self-report-day.dto';

@ApiTags('Time Tracking')
@Controller('time-entries')
@Module('LABOR')
export class TimeEntryController {
  constructor(
    private readonly service: TimeTrackingService,
    private readonly confirmationService: TimeEntryConfirmationService,
    private readonly employeesService: EmployeesService,
  ) {}

  /** Rotas públicas (sem login) — precisam vir antes de `:id`. */
  @Public()
  @Get('confirmations/public/:id')
  getConfirmationPublicInfo(@Param('id') id: string, @Query('token') token: string) {
    return this.confirmationService.getPublicInfo(id, token);
  }

  @Public()
  @Post('confirmations/public/:id/confirm')
  confirmConfirmationPublic(@Param('id') id: string, @Query('token') token: string) {
    return this.confirmationService.confirmPublic(id, token);
  }

  /** Autoatendimento — sem permissão, o colaborador confirma o próprio mês. */
  @Post('confirmations/me/:year/:month/confirm')
  async confirmMine(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    const employee = await this.employeesService.findMine(companyId, userId);
    return this.confirmationService.confirmMine(companyId, employee.id, Number(year), Number(month), userId);
  }

  @Get('confirmations')
  @Permissions('time-entry.view')
  @ApiOperation({ summary: 'Listar confirmações mensais de ponto' })
  findConfirmations(
    @CurrentUser('companyId') companyId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.confirmationService.findAll(companyId, {
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    });
  }

  @Post('confirmations/send/:employeeId/:year/:month')
  @Permissions('time-entry.confirm-item')
  @ApiOperation({ summary: 'Enviar confirmação do mês pra um colaborador' })
  sendConfirmation(
    @CurrentUser('companyId') companyId: string,
    @Param('employeeId') employeeId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.confirmationService.send(companyId, employeeId, Number(year), Number(month));
  }

  @Post('confirmations/send-bulk/:year/:month')
  @Permissions('time-entry.confirm-item')
  @ApiOperation({ summary: 'Enviar confirmação do mês em massa (todo colaborador com batida no mês)' })
  sendConfirmationBulk(
    @CurrentUser('companyId') companyId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.confirmationService.sendBulk(companyId, Number(year), Number(month));
  }

  @Patch('confirmations/:id/confirm')
  @Permissions('time-entry.confirm-item')
  @ApiOperation({ summary: 'Confirmar recebimento manualmente' })
  confirmConfirmationItem(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.confirmationService.confirm(companyId, id, userId);
  }

  @Post()
  @Permissions('time-entry.create')
  @ApiOperation({ summary: 'Registrar uma batida de ponto' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateTimeEntryDto,
  ) {
    return this.service.createEntry(companyId, dto);
  }

  @Get('day-summary')
  @Permissions('time-entry.view')
  @ApiOperation({
    summary: 'Folha de ponto por dia (batidas + horas + status)',
  })
  async getDaySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: TimeEntryFilterDto,
  ) {
    filter.employeeId = await this.employeesService.resolveViewableEmployeeId(
      user,
      filter.employeeId,
    );
    return this.service.getDaySummaries(user.companyId, filter);
  }

  @Get('adjustments')
  @Permissions('time-entry.view')
  @ApiOperation({
    summary: 'Histórico de ajustes manuais de ponto',
  })
  async getAdjustments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: TimeEntryFilterDto,
  ) {
    filter.employeeId = await this.employeesService.resolveViewableEmployeeId(
      user,
      filter.employeeId,
    );
    return this.service.getAdjustments(user.companyId, filter);
  }

  @Delete(':id')
  @Permissions('time-entry.update')
  @ApiOperation({ summary: 'Excluir uma batida (dia ainda não aprovado)' })
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteEntry(companyId, id);
  }

  @Delete('adjustments/:id')
  @Permissions('time-entry.update')
  @ApiOperation({ summary: 'Desfazer um ajuste manual (restaura as batidas de antes)' })
  reverseAdjustment(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.reverseAdjustment(companyId, id);
  }

  @Post('approve')
  @Permissions('time-entry.approve')
  @ApiOperation({ summary: 'Aprovar o dia trabalhado de um colaborador' })
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: DayActionDto,
  ) {
    return this.service.approveDay(companyId, userId, dto);
  }

  @Post('reopen')
  @Permissions('time-entry.approve')
  @ApiOperation({ summary: 'Reabrir um dia já aprovado' })
  reopen(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: DayActionDto,
  ) {
    return this.service.reopenDay(companyId, dto);
  }

  @Post('self-report')
  @Permissions('time-entry.create')
  @ApiOperation({
    summary:
      'Ponto - Manual: o colaborador logado lança o próprio dia inteiro (4 horários obrigatórios)',
  })
  selfReport(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SelfReportDayDto,
  ) {
    return this.service.selfReportDay(companyId, userId, dto);
  }

  @Patch('adjust')
  @Permissions('time-entry.update')
  @ApiOperation({
    summary:
      'Ajustar manualmente os horários do dia (dia ainda não aprovado, com justificativa)',
  })
  adjust(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AdjustDayDto,
  ) {
    return this.service.adjustDay(companyId, userId, dto);
  }
}
