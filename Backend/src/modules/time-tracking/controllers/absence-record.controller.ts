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
import type { AuthenticatedUser } from '../../identity/auth/interfaces/authenticated-user.interface';

import { AbsenceService } from '../services/absence.service';
import { EmployeesService } from '../../employees/services/employees.service';

import { CreateAbsenceRecordDto } from '../dto/create-absence-record.dto';
import { UpdateAbsenceRecordDto } from '../dto/update-absence-record.dto';
import { AbsenceFilterDto } from '../dto/absence-filter.dto';

@ApiTags('Absence Records')
@Controller('absence-records')
@Module('LABOR')
export class AbsenceRecordController {
  constructor(
    private readonly service: AbsenceService,
    private readonly employeesService: EmployeesService,
  ) {}

  @Post()
  @Permissions('absence-record.create')
  @ApiOperation({ summary: 'Registrar falta ou abono' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateAbsenceRecordDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('absence-record.view')
  @ApiOperation({ summary: 'Listar faltas e abonos' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: AbsenceFilterDto,
  ) {
    filter.employeeId = await this.employeesService.resolveViewableEmployeeId(
      user,
      filter.employeeId,
    );
    return this.service.findAll(user.companyId, filter);
  }

  @Get(':id')
  @Permissions('absence-record.view')
  @ApiOperation({ summary: 'Buscar falta/abono' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('absence-record.update')
  @ApiOperation({ summary: 'Alterar falta/abono (só pendente)' })
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAbsenceRecordDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Permissions('absence-record.update')
  @ApiOperation({ summary: 'Excluir falta/abono (só pendente)' })
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }

  @Patch(':id/approve')
  @Permissions('absence-record.approve')
  @ApiOperation({ summary: 'Aprovar falta/abono' })
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.approve(companyId, userId, id);
  }

  @Patch(':id/reject')
  @Permissions('absence-record.approve')
  @ApiOperation({ summary: 'Rejeitar falta/abono' })
  reject(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.reject(companyId, userId, id);
  }

  @Patch(':id/reopen')
  @Permissions('absence-record.approve')
  @ApiOperation({ summary: 'Reabrir (voltar pra pendente)' })
  reopen(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.reopen(companyId, id);
  }
}
