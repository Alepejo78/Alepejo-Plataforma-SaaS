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
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { TimeTrackingService } from '../services/time-tracking.service';

import { CreateTimeEntryDto } from '../dto/create-time-entry.dto';
import { TimeEntryFilterDto } from '../dto/time-entry-filter.dto';
import { DayActionDto } from '../dto/day-action.dto';
import { AdjustDayDto } from '../dto/adjust-day.dto';
import { SelfReportDayDto } from '../dto/self-report-day.dto';

@ApiTags('Time Tracking')
@Controller('time-entries')
@Module('LABOR')
export class TimeEntryController {
  constructor(private readonly service: TimeTrackingService) {}

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
  getDaySummary(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: TimeEntryFilterDto,
  ) {
    return this.service.getDaySummaries(companyId, filter);
  }

  @Get('adjustments')
  @Permissions('time-entry.view')
  @ApiOperation({
    summary: 'Histórico de ajustes manuais de ponto',
  })
  getAdjustments(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: TimeEntryFilterDto,
  ) {
    return this.service.getAdjustments(companyId, filter);
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
